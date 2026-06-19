import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { TestBuilder } from "./_components/TestBuilder"

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id, lessonId } = await params
  const session = await auth()
  if (!session) return null

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: { include: { trainers: true } },
      test: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { answers: true },
          },
        },
      },
    },
  })

  if (!lesson || lesson.courseId !== id) notFound()

  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (lesson.course.primaryTrainerId === userId ||
      lesson.course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) notFound()

  return (
    <TestBuilder
      lessonId={lessonId}
      courseId={id}
      lessonName={lesson.name}
      test={
        lesson.test
          ? {
              id: lesson.test.id,
              introText: lesson.test.introText,
              timeLimit: lesson.test.timeLimit,
              minPassPercent: lesson.test.minPassPercent,
              maxRetries: lesson.test.maxRetries,
              randomOrder: lesson.test.randomOrder,
            }
          : null
      }
      questions={
        lesson.test?.questions.map((q) => ({
          id: q.id,
          text: q.text,
          points: q.points,
          order: q.order,
          answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
        })) ?? []
      }
    />
  )
}
