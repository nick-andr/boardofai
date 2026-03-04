import { NextResponse } from 'next/server'
import { getEnabledModels } from '@/lib/models'

export async function GET() {
  try {
    const models = getEnabledModels()
    return NextResponse.json(models)
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
