// ============================================================
// OVERRUN — Phase 1 Timeline Task Seeder (Sept 12 – Dec 4, 2026)
// ============================================================
// Schedules Phase 1 tasks into the timeline while respecting:
// 1. Permanent COEP classes & travel blocks
// 2. Mandatory 1.5h daily College Studies & Assignments window
// 3. 3 core execution streams: DSA Grind, WhatsApp Business, Portfolio Launch

import type { TaskInstance } from '@/data/types';

export function generatePhase1Tasks(startDateStr = '2026-09-12', endDateStr = '2026-12-04'): Record<string, TaskInstance[]> {
  const result: Record<string, TaskInstance[]> = {};
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  const curr = new Date(start);

  while (curr <= end) {
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const dowIndex = curr.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Calculate week offset relative to Sept 12, 2026
    const diffDays = Math.floor((curr.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffDays / 7) + 1;

    // Define stream task titles based on week milestone
    let dsaTitle = 'Binary Trees — Operations & Traversals';
    let bizTitle = 'WhatsApp Automation — Client 1 Setup & Workflows';
    let projTitle = 'Portfolio Project — Architecture & GitHub Setup';

    if (weekNum >= 3 && weekNum <= 4) {
      dsaTitle = 'Graph Algorithms — BFS, DFS & Topological Sort';
      bizTitle = 'WhatsApp Automation — Client 2 Closing & Scope 5x';
      projTitle = 'Portfolio Project — Shipping MVP Core Features';
    } else if (weekNum >= 5 && weekNum <= 6) {
      dsaTitle = 'Dynamic Programming — Coin Change & Knapsack';
      bizTitle = 'WhatsApp Automation — Zero-Revision Delivery for Client 2';
      projTitle = 'Portfolio Project — 500 Stars Push & HN Show';
    } else if (weekNum >= 7 && weekNum <= 8) {
      dsaTitle = 'DSA Mock Interview 1 & Timed Hard Problems';
      bizTitle = 'WhatsApp Automation — $5K MRR Pipeline Scaling';
      projTitle = 'Portfolio Project — External PRs & Community Growth';
    } else if (weekNum >= 9) {
      dsaTitle = 'Advanced DSA — Segment Trees & Disjoint Sets';
      bizTitle = 'AI Automation Platform — Upsell & Claude API Integration';
      projTitle = 'Portfolio Project — Commercial Features & Freemium Model';
    }

    const dayTasks: TaskInstance[] = [];

    // MON: College timetable 10:30-12:30, 13:30-14:30. Travel: 08:30-10:30, 14:30-16:30.
    if (dowIndex === 1) {
      dayTasks.push(
        {
          id: `dsa-${dateKey}`,
          dateKey,
          start: '06:30',
          end: '08:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `DSA Grind: ${dsaTitle}`,
          rawLine: `[DATE::${dateKey}] [START::06:30] [END::08:30] [TYPE::A] [TASK::DSA Grind: ${dsaTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `college-sub-${dateKey}`,
          dateKey,
          start: '16:30',
          end: '18:00',
          type: 'C',
          deadline: `${dateKey} 23:59`,
          task: 'College Studies, Assignments & Submissions',
          rawLine: `[DATE::${dateKey}] [START::16:30] [END::18:00] [TYPE::C] [TASK::College Studies, Assignments & Submissions]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `biz-${dateKey}`,
          dateKey,
          start: '18:15',
          end: '19:45',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `WhatsApp Agency: ${bizTitle}`,
          rawLine: `[DATE::${dateKey}] [START::18:15] [END::19:45] [TYPE::A] [TASK::WhatsApp Agency: ${bizTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `proj-${dateKey}`,
          dateKey,
          start: '20:00',
          end: '21:30',
          type: 'B',
          deadline: `${dateKey} 23:59`,
          task: `Portfolio Build: ${projTitle}`,
          rawLine: `[DATE::${dateKey}] [START::20:00] [END::21:30] [TYPE::B] [TASK::Portfolio Build: ${projTitle}]`,
          isValid: true,
          status: 'pending',
        }
      );
    }
    // TUE: College timetable 10:30-17:30. Travel: 08:30-10:30, 17:30-19:30.
    else if (dowIndex === 2) {
      dayTasks.push(
        {
          id: `dsa-${dateKey}`,
          dateKey,
          start: '06:30',
          end: '08:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `DSA Grind: ${dsaTitle}`,
          rawLine: `[DATE::${dateKey}] [START::06:30] [END::08:30] [TYPE::A] [TASK::DSA Grind: ${dsaTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `college-sub-${dateKey}`,
          dateKey,
          start: '19:30',
          end: '21:00',
          type: 'C',
          deadline: `${dateKey} 23:59`,
          task: 'College Studies, Assignments & Submissions',
          rawLine: `[DATE::${dateKey}] [START::19:30] [END::21:00] [TYPE::C] [TASK::College Studies, Assignments & Submissions]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `biz-${dateKey}`,
          dateKey,
          start: '21:00',
          end: '22:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `WhatsApp Agency: ${bizTitle}`,
          rawLine: `[DATE::${dateKey}] [START::21:00] [END::22:30] [TYPE::A] [TASK::WhatsApp Agency: ${bizTitle}]`,
          isValid: true,
          status: 'pending',
        }
      );
    }
    // WED: College timetable 10:30-15:30. Travel: 08:30-10:30, 15:30-17:30.
    else if (dowIndex === 3) {
      dayTasks.push(
        {
          id: `dsa-${dateKey}`,
          dateKey,
          start: '06:30',
          end: '08:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `DSA Grind: ${dsaTitle}`,
          rawLine: `[DATE::${dateKey}] [START::06:30] [END::08:30] [TYPE::A] [TASK::DSA Grind: ${dsaTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `college-sub-${dateKey}`,
          dateKey,
          start: '17:30',
          end: '19:00',
          type: 'C',
          deadline: `${dateKey} 23:59`,
          task: 'College Studies, Assignments & Submissions',
          rawLine: `[DATE::${dateKey}] [START::17:30] [END::19:00] [TYPE::C] [TASK::College Studies, Assignments & Submissions]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `biz-${dateKey}`,
          dateKey,
          start: '19:15',
          end: '20:45',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `WhatsApp Agency: ${bizTitle}`,
          rawLine: `[DATE::${dateKey}] [START::19:15] [END::20:45] [TYPE::A] [TASK::WhatsApp Agency: ${bizTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `proj-${dateKey}`,
          dateKey,
          start: '21:00',
          end: '22:30',
          type: 'B',
          deadline: `${dateKey} 23:59`,
          task: `Portfolio Build: ${projTitle}`,
          rawLine: `[DATE::${dateKey}] [START::21:00] [END::22:30] [TYPE::B] [TASK::Portfolio Build: ${projTitle}]`,
          isValid: true,
          status: 'pending',
        }
      );
    }
    // THU: College timetable 09:30-10:30, 13:30-18:30. Travel: 07:30-09:30, 18:30-20:30.
    else if (dowIndex === 4) {
      dayTasks.push(
        {
          id: `dsa-${dateKey}`,
          dateKey,
          start: '06:00',
          end: '07:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `DSA Grind: ${dsaTitle}`,
          rawLine: `[DATE::${dateKey}] [START::06:00] [END::07:30] [TYPE::A] [TASK::DSA Grind: ${dsaTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `proj-${dateKey}`,
          dateKey,
          start: '11:00',
          end: '12:30',
          type: 'B',
          deadline: `${dateKey} 23:59`,
          task: `Portfolio Build: ${projTitle}`,
          rawLine: `[DATE::${dateKey}] [START::11:00] [END::12:30] [TYPE::B] [TASK::Portfolio Build: ${projTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `college-sub-${dateKey}`,
          dateKey,
          start: '20:30',
          end: '21:30',
          type: 'C',
          deadline: `${dateKey} 23:59`,
          task: 'College Studies, Assignments & Submissions',
          rawLine: `[DATE::${dateKey}] [START::20:30] [END::21:30] [TYPE::C] [TASK::College Studies, Assignments & Submissions]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `biz-${dateKey}`,
          dateKey,
          start: '21:30',
          end: '23:00',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `WhatsApp Agency: ${bizTitle}`,
          rawLine: `[DATE::${dateKey}] [START::21:30] [END::23:00] [TYPE::A] [TASK::WhatsApp Agency: ${bizTitle}]`,
          isValid: true,
          status: 'pending',
        }
      );
    }
    // FRI: College timetable 09:30-12:30, 13:30-15:30, 16:30-18:30. Travel: 07:30-09:30, 18:30-20:30.
    else if (dowIndex === 5) {
      dayTasks.push(
        {
          id: `dsa-${dateKey}`,
          dateKey,
          start: '06:00',
          end: '07:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `DSA Grind: ${dsaTitle}`,
          rawLine: `[DATE::${dateKey}] [START::06:00] [END::07:30] [TYPE::A] [TASK::DSA Grind: ${dsaTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `college-sub-${dateKey}`,
          dateKey,
          start: '20:30',
          end: '21:30',
          type: 'C',
          deadline: `${dateKey} 23:59`,
          task: 'College Studies, Assignments & Submissions',
          rawLine: `[DATE::${dateKey}] [START::20:30] [END::21:30] [TYPE::C] [TASK::College Studies, Assignments & Submissions]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `biz-${dateKey}`,
          dateKey,
          start: '21:30',
          end: '23:00',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `WhatsApp Agency: ${bizTitle}`,
          rawLine: `[DATE::${dateKey}] [START::21:30] [END::23:00] [TYPE::A] [TASK::WhatsApp Agency: ${bizTitle}]`,
          isValid: true,
          status: 'pending',
        }
      );
    }
    // SAT: No classes. Today Sept 12 2026 starts after 14:00.
    else if (dowIndex === 6) {
      dayTasks.push(
        {
          id: `biz-${dateKey}`,
          dateKey,
          start: '14:15',
          end: '16:15',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `WhatsApp Agency: ${bizTitle}`,
          rawLine: `[DATE::${dateKey}] [START::14:15] [END::16:15] [TYPE::A] [TASK::WhatsApp Agency: ${bizTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `college-sub-${dateKey}`,
          dateKey,
          start: '16:30',
          end: '18:00',
          type: 'C',
          deadline: `${dateKey} 23:59`,
          task: 'College Studies, Assignments & Submissions',
          rawLine: `[DATE::${dateKey}] [START::16:30] [END::18:00] [TYPE::C] [TASK::College Studies, Assignments & Submissions]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `dsa-${dateKey}`,
          dateKey,
          start: '18:30',
          end: '20:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `DSA Grind: ${dsaTitle}`,
          rawLine: `[DATE::${dateKey}] [START::18:30] [END::20:30] [TYPE::A] [TASK::DSA Grind: ${dsaTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `proj-${dateKey}`,
          dateKey,
          start: '21:00',
          end: '22:30',
          type: 'B',
          deadline: `${dateKey} 23:59`,
          task: `Portfolio Build: ${projTitle}`,
          rawLine: `[DATE::${dateKey}] [START::21:00] [END::22:30] [TYPE::B] [TASK::Portfolio Build: ${projTitle}]`,
          isValid: true,
          status: 'pending',
        }
      );
    }
    // SUN (FREE DAY)
    else if (dowIndex === 0) {
      dayTasks.push(
        {
          id: `dsa-${dateKey}`,
          dateKey,
          start: '09:00',
          end: '11:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `DSA Intensive: ${dsaTitle}`,
          rawLine: `[DATE::${dateKey}] [START::09:00] [END::11:30] [TYPE::A] [TASK::DSA Intensive: ${dsaTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `biz-${dateKey}`,
          dateKey,
          start: '14:00',
          end: '16:30',
          type: 'A',
          deadline: `${dateKey} 23:59`,
          task: `WhatsApp Agency: ${bizTitle}`,
          rawLine: `[DATE::${dateKey}] [START::14:00] [END::16:30] [TYPE::A] [TASK::WhatsApp Agency: ${bizTitle}]`,
          isValid: true,
          status: 'pending',
        },
        {
          id: `proj-${dateKey}`,
          dateKey,
          start: '17:00',
          end: '19:00',
          type: 'B',
          deadline: `${dateKey} 23:59`,
          task: `Portfolio Project: ${projTitle}`,
          rawLine: `[DATE::${dateKey}] [START::17:00] [END::19:00] [TYPE::B] [TASK::Portfolio Project: ${projTitle}]`,
          isValid: true,
          status: 'pending',
        }
      );
    }

    result[dateKey] = dayTasks;
    curr.setDate(curr.getDate() + 1);
  }

  return result;
}
