import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        prompts: {
          include: {
            responses: {
              include: {
                viewpoint: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            summary: true,
            _count: {
              select: { responses: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
