export type AcademyModuleId = "M1_SOP_SEQUENCE" | "M2_READY_CHECKLIST";

export type LessonScreen = {
  title_km: string;
  title_en: string;
  body_km: string;
  body_en: string;
};

export type QuizOption = { id: string; km: string; en: string; correct: boolean };

export type AcademyModule = {
  id: AcademyModuleId;
  name_km: string;
  name_en: string;
  screens: LessonScreen[];
  quiz: { question_km: string; question_en: string; options: QuizOption[] };
};

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: "M1_SOP_SEQUENCE",
    name_km: "លំដាប់ SOP (Accept → Delivered)",
    name_en: "SOP Sequence (Accept → Delivered)",
    screens: [
      {
        title_km: "មេរៀន 1/3",
        title_en: "Lesson 1/3",
        body_km: "លំដាប់ត្រឹមត្រូវ៖ Accept → Cooking → Ready → Book Driver → Picked → Delivered",
        body_en: "Correct sequence: Accept → Cooking → Ready → Book Driver → Picked → Delivered"
      },
      {
        title_km: "មេរៀន 2/3",
        title_en: "Lesson 2/3",
        body_km: "កុំ Ready មុន Cooking។ កុំ Delivered មុន Picked។",
        body_en: "Never Ready before Cooking. Never Delivered before Picked."
      },
      {
        title_km: "មេរៀន 3/3",
        title_en: "Lesson 3/3",
        body_km: "បើមានបញ្ហា → Issue (ជ្រើស reason) ដើម្បីកត់ត្រា។",
        body_en: "If there’s a problem → Issue (choose reason) for audit trail."
      }
    ],
    quiz: {
      question_km: "ក្រោយ ACCEPTED ត្រូវធ្វើអ្វីបន្ទាប់?",
      question_en: "What comes next after ACCEPTED?",
      options: [
        { id: "A", km: "Ready", en: "Ready", correct: false },
        { id: "B", km: "Cooking", en: "Cooking", correct: true },
        { id: "C", km: "Delivered", en: "Delivered", correct: false }
      ]
    }
  },
  {
    id: "M2_READY_CHECKLIST",
    name_km: "Ready Checklist",
    name_en: "Ready Checklist",
    screens: [
      {
        title_km: "មេរៀន 1/2",
        title_en: "Lesson 1/2",
        body_km: "មុន Ready ត្រូវ Confirm checklist (wings/dips/carrots/packaging)",
        body_en: "Before Ready, confirm checklist (wings/dips/carrots/packaging)."
      },
      {
        title_km: "មេរៀន 2/2",
        title_en: "Lesson 2/2",
        body_km: "Checklist ជួយកាត់បន្ថយកំហុស និងបង្កើនល្បឿនដឹកជញ្ជូន។",
        body_en: "Checklist reduces mistakes and speeds dispatch."
      }
    ],
    quiz: {
      question_km: "មុនចុច Ready ត្រូវធ្វើអ្វី?",
      question_en: "Before tapping Ready, what must you do?",
      options: [
        { id: "A", km: "Confirm Ready Checklist", en: "Confirm Ready Checklist", correct: true },
        { id: "B", km: "Book Driver", en: "Book Driver", correct: false }
      ]
    }
  }
];
