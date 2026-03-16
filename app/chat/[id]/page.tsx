import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ConversationView from '@/app/components/ConversationView'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await Promise.resolve(params)
  const conversation = await prisma.conversation.findUnique({
    where: { id: resolvedParams.id },
    include: {
      prompts: {
        orderBy: { createdAt: 'asc' },
        include: {
          responses: true,
          summary: true,
        },
      },
      parent: true,
    },
  })

  if (!conversation || conversation.prompts.length === 0) {
    return notFound()
  }

  const initialTurns = conversation.prompts.map((p) => ({
    promptId: p.id,
    prompt: p.content,
    responses: p.responses.map((r) => ({
      modelId: r.modelId,
      modelName: r.modelName,
      content: r.content,
      success: r.status === 'completed',
      error: r.error ?? undefined,
    })),
    summary: p.summary ? { content: p.summary.content } : null,
  }))

  return (
    <ConversationView
      conversationId={conversation.id}
      initialTurns={initialTurns}
      parentId={conversation.parentId}
      boundModelId={conversation.modelId}
      parentTitle={conversation.parent?.title ?? null}
    />
  )
}

