import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        summary: true,
        responses: {
          include: {
            viewpoint: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { responses: true },
        },
      },
    })

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Group viewpoints
    const viewpoints = await prisma.viewpoint.findMany({
      where: { promptId: id },
      include: {
        responses: {
          select: {
            id: true,
            modelName: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...prompt,
      viewpoints: viewpoints.map((v) => ({
        title: v.title,
        description: v.description,
        responseIndices: v.responses.map((r) =>
          prompt.responses.findIndex((pr) => pr.id === r.id)
        ),
      })),
    })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
