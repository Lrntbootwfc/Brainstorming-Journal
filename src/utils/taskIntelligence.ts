import { ActionItem, TaskDependencyRule, TaskOrderingPlan, TaskPriority, TaskStatus } from '../types';

/**
 * Normalizes text for deduplication comparison
 */
export function normalizeTaskText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicates actions ensuring that repeatedly processing the same journal entry
 * or analyzing multiple entries does not create duplicate tasks.
 */
export function deduplicateActions(
  existingTasks: ActionItem[],
  incomingItems: (ActionItem | string)[],
  sourceEntryId: string,
  sessionTitle: string
): ActionItem[] {
  const result = [...existingTasks];
  const seenNorms = new Set(result.map((t) => normalizeTaskText(t.text)));

  incomingItems.forEach((item, index) => {
    const rawText = typeof item === 'string' ? item : item.text;
    if (!rawText || !rawText.trim()) return;

    const norm = normalizeTaskText(rawText);
    if (!seenNorms.has(norm)) {
      seenNorms.add(norm);

      if (typeof item === 'object' && item.id) {
        result.push({
          ...item,
          sourceEntryId: item.sourceEntryId || sourceEntryId,
          sessionId: item.sessionId || sourceEntryId,
          sessionTitle: item.sessionTitle || sessionTitle,
          status: item.status || (item.isCompleted ? 'completed' : 'pending'),
          isCompleted: Boolean(item.isCompleted || item.status === 'completed'),
        });
      } else {
        result.push({
          id: `task_${sourceEntryId}_${index}_${Math.random().toString(36).slice(2, 6)}`,
          text: rawText.trim(),
          sourceEntryId,
          sessionId: sourceEntryId,
          sessionTitle,
          priority: 'Medium',
          status: 'pending',
          isCompleted: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // If task already exists, update session title or source if missing, but preserve status
      const existingIdx = result.findIndex((t) => normalizeTaskText(t.text) === norm);
      if (existingIdx >= 0) {
        if (!result[existingIdx].sessionTitle && sessionTitle) {
          result[existingIdx].sessionTitle = sessionTitle;
        }
        if (!result[existingIdx].sourceEntryId && sourceEntryId) {
          result[existingIdx].sourceEntryId = sourceEntryId;
          result[existingIdx].sessionId = sourceEntryId;
        }
      }
    }
  });

  return result;
}

/**
 * Heuristic stage rank for detecting genuine prerequisite verbs:
 * Rank 1 (Research/Explore/Design) -> Rank 2 (Build/Implement/Write) -> Rank 3 (Test/Review/Validate) -> Rank 4 (Deploy/Launch/Publish)
 */
const PREREQUISITE_VERB_PATTERNS = [
  { rank: 1, label: 'Research & Exploration', regex: /\b(research|investigate|study|explore|gather|read|interview|outline|draft|brainstorm|plan|define)\b/i },
  { rank: 2, label: 'Architecture & Foundation', regex: /\b(setup|set up|configure|install|architect|scaffold|design)\b/i },
  { rank: 3, label: 'Execution & Building', regex: /\b(build|develop|create|code|implement|write|produce|make|construct)\b/i },
  { rank: 4, label: 'Verification & Testing', regex: /\b(test|verify|validate|review|audit|debug|evaluate|check)\b/i },
  { rank: 5, label: 'Delivery & Release', regex: /\b(deploy|launch|publish|release|ship|deliver|present|share)\b/i },
];

function getTaskStageRank(text: string): { rank: number; stageName: string } | null {
  for (const pattern of PREREQUISITE_VERB_PATTERNS) {
    if (pattern.regex.test(text)) {
      return { rank: pattern.rank, stageName: pattern.label };
    }
  }
  return null;
}

/**
 * Detects lightweight task dependencies only when reasonable evidence is present.
 * For example:
 * "Research topic" -> "Build prototype" -> "Test prototype"
 */
export function inferTaskDependencies(tasks: ActionItem[]): {
  tasksWithDependencies: ActionItem[];
  rules: TaskDependencyRule[];
  dependenciesFound: boolean;
} {
  const rules: TaskDependencyRule[] = [];
  const taskMap = new Map<string, ActionItem>();

  // Copy tasks
  tasks.forEach((t) => {
    taskMap.set(t.id, {
      ...t,
      dependsOn: t.dependsOn ? [...t.dependsOn] : [],
      prerequisiteFor: t.prerequisiteFor ? [...t.prerequisiteFor] : [],
    });
  });

  const taskList = Array.from(taskMap.values());

  // Check pairs within the same source entry or sharing related contexts
  for (let i = 0; i < taskList.length; i++) {
    for (let j = 0; j < taskList.length; j++) {
      if (i === j) continue;
      const taskA = taskList[i];
      const taskB = taskList[j];

      // Explicit dependency already declared
      if (taskB.dependsOn && taskB.dependsOn.includes(taskA.id)) {
        rules.push({
          taskId: taskB.id,
          dependsOnId: taskA.id,
          relationshipType: 'depends_on',
          reason: `Explicitly marked as depending on "${taskA.text}".`,
        });
        continue;
      }

      // If from the same session or sharing relevant keyword stems
      const sameSession = taskA.sourceEntryId && taskB.sourceEntryId && taskA.sourceEntryId === taskB.sourceEntryId;
      const rankA = getTaskStageRank(taskA.text);
      const rankB = getTaskStageRank(taskB.text);

      if (rankA && rankB && rankA.rank < rankB.rank) {
        // Evidence of sequential dependency (e.g. Research -> Build, Build -> Test, Test -> Launch)
        if (sameSession || rankB.rank - rankA.rank === 1) {
          if (!taskB.dependsOn!.includes(taskA.id)) {
            taskB.dependsOn!.push(taskA.id);
            taskA.prerequisiteFor!.push(taskB.id);

            rules.push({
              taskId: taskB.id,
              dependsOnId: taskA.id,
              relationshipType: 'prerequisite',
              reason: `"${taskA.text}" (${rankA.stageName}) is a prerequisite before "${taskB.text}" (${rankB.stageName}).`,
            });
          }
        }
      }
    }
  }

  return {
    tasksWithDependencies: Array.from(taskMap.values()),
    rules,
    dependenciesFound: rules.length > 0,
  };
}

/**
 * Intelligent ordering priority:
 * 1. Explicit dependencies (topological prerequisite ordering)
 * 2. Explicit deadlines (earliest first)
 * 3. Clear prerequisite relationships
 * 4. Existing task priority (High > Medium > Low)
 *
 * Completed tasks are kept at the bottom so active tasks are immediately accessible.
 */
export function orderTasksByDependencies(tasks: ActionItem[]): TaskOrderingPlan {
  if (tasks.length === 0) {
    return {
      orderedTasks: [],
      explanation: 'No tasks to order.',
      dependenciesFound: false,
    };
  }

  // 1. Detect dependencies
  const { tasksWithDependencies, rules, dependenciesFound } = inferTaskDependencies(tasks);

  // Split into active and completed
  const activeTasks = tasksWithDependencies.filter((t) => !t.isCompleted && t.status !== 'completed');
  const completedTasks = tasksWithDependencies.filter((t) => t.isCompleted || t.status === 'completed');

  // Priority score helper (High=3, Medium=2, Low=1)
  const priorityWeight = (p?: TaskPriority): number => {
    switch (p) {
      case 'High':
        return 3;
      case 'Medium':
        return 2;
      case 'Low':
        return 1;
      default:
        return 2;
    }
  };

  // Topological sorting for active tasks with cycle prevention
  const sortedActive: ActionItem[] = [];
  const inDegree = new Map<string, number>();
  const activeMap = new Map<string, ActionItem>();

  activeTasks.forEach((t) => {
    activeMap.set(t.id, t);
    // Count active prerequisites
    const activePrereqs = (t.dependsOn || []).filter((depId) =>
      activeTasks.some((at) => at.id === depId)
    );
    inDegree.set(t.id, activePrereqs.length);
  });

  // Ready queue contains tasks with 0 active prerequisites
  const queue: ActionItem[] = activeTasks.filter((t) => (inDegree.get(t.id) || 0) === 0);

  // Sort queue by: (1) explicit deadline, (2) priority
  const sortReadyQueue = (q: ActionItem[]) => {
    q.sort((a, b) => {
      // Deadline priority
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline) {
        const dDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (dDiff !== 0) return dDiff;
      }
      // Priority weight
      const pDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (pDiff !== 0) return pDiff;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  sortReadyQueue(queue);

  let stepNumber = 1;

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Construct human-explainable order reason
    let reason = '';
    if (current.prerequisiteFor && current.prerequisiteFor.length > 0) {
      const target = activeMap.get(current.prerequisiteFor[0]);
      reason = target
        ? `Prerequisite for "${target.text.slice(0, 30)}${target.text.length > 30 ? '...' : ''}"`
        : 'Foundational prerequisite task';
    } else if (current.dependsOn && current.dependsOn.length > 0) {
      const parent = activeMap.get(current.dependsOn[0]);
      reason = parent
        ? `Follows prerequisite "${parent.text.slice(0, 25)}${parent.text.length > 25 ? '...' : ''}"`
        : 'Sequenced after prerequisite';
    } else if (current.deadline) {
      reason = `Target deadline: ${current.deadline}`;
    } else if (current.priority === 'High') {
      reason = 'High priority reflection takeaway';
    } else {
      reason = 'Standard priority';
    }

    current.suggestedOrder = stepNumber++;
    current.orderReason = reason;
    sortedActive.push(current);

    // Reduce inDegree for dependent tasks
    activeTasks.forEach((other) => {
      if (other.dependsOn && other.dependsOn.includes(current.id)) {
        const remaining = (inDegree.get(other.id) || 1) - 1;
        inDegree.set(other.id, remaining);
        if (remaining === 0) {
          queue.push(other);
          sortReadyQueue(queue);
        }
      }
    });
  }

  // If circular dependencies or remaining tasks, append them cleanly
  activeTasks.forEach((t) => {
    if (!sortedActive.some((st) => st.id === t.id)) {
      t.suggestedOrder = stepNumber++;
      t.orderReason = t.deadline ? `Target deadline: ${t.deadline}` : 'Standard task';
      sortedActive.push(t);
    }
  });

  // Label completed tasks
  completedTasks.forEach((t) => {
    t.suggestedOrder = stepNumber++;
    t.orderReason = 'Completed';
  });

  const explanation = dependenciesFound
    ? `Tasks ordered intelligently: ${rules.length} prerequisite relationship(s) detected and applied.`
    : 'Tasks ordered by explicit deadlines and priority rankings.';

  return {
    orderedTasks: [...sortedActive, ...completedTasks],
    explanation,
    dependenciesFound,
  };
}
