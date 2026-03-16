import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Fetch top-level conversations (board + any standalone) and their 1:1 children.
    const parents = await prisma.conversation.findMany({
      where: { parentId: null },
      include: {
        children: true,
      },
      take: 50,
    })

    // Sort parents by last activity including children.
    const sortedParents = parents
      .map((p) => {
        const parentTime = new Date(p.updatedAt).getTime()
        const childTimes = p.children.map((c) =>
          new Date(c.updatedAt).getTime(),
        )
        const lastActivity = Math.max(parentTime, ...(childTimes.length ? childTimes : [parentTime]))
        return { parent: p, lastActivity }
      })
      .sort((a, b) => b.lastActivity - a.lastActivity)

    const payload = sortedParents.map(({ parent }) => ({
      id: parent.id,
      title: parent.title,
      updatedAt: parent.updatedAt,
      modelId: parent.modelId,
      parentId: parent.parentId,
      children: parent.children
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .map((c) => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt,
          modelId: c.modelId,
          parentId: c.parentId,
        })),
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

