# BoardOfAI - Multi-LLM Board of Directors

BoardOfAI simulates a board of directors composed of multiple AI models. Instead of asking a single LLM, users submit prompts and receive parallel responses from multiple AI models, along with a synthesized summary and grouped viewpoints.

## Features

- **Multi-Model Parallel Processing**: Submit a prompt and receive responses from multiple AI models simultaneously
- **Intelligent Summarization**: Automatic generation of consolidated summaries from all responses
- **Viewpoint Clustering**: Responses are grouped by similar perspectives or conclusions
- **Real-Time Streaming**: Progressive display of responses as they're generated
- **Model Selection**: Choose which AI models participate in each session
- **Conversation History**: Save and revisit past conversations
- **Beautiful UI**: Modern, responsive interface with loading animations

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **LLM Integration**: OpenRouter API (supports multiple providers)
- **Real-Time**: Server-Sent Events (SSE) streaming

## Prerequisites

- Node.js 20.9+ (required for Next.js 16)
- PostgreSQL database
- OpenRouter API key ([get one here](https://openrouter.ai/))

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/boardofai?schema=public"

# OpenRouter API
OPENROUTER_API_KEY="your_openrouter_api_key_here"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed with default model catalog
npx prisma db seed
```

### 4. Configure AI Models

Edit `lib/models.ts` to configure which AI models are available. The default configuration includes:

- GPT-4o (OpenAI)
- GPT-4o Mini (OpenAI)
- Claude 3.5 Sonnet (Anthropic)
- Claude 3 Opus (Anthropic)
- Gemini Pro 1.5 (Google)
- Llama 3.1 70B (Meta)

You can enable/disable models and add new ones by modifying the `DEFAULT_MODELS` array.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
boardofai/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── stream/route.ts    # Streaming chat endpoint
│   │   ├── conversations/route.ts  # Conversation list
│   │   ├── conversations/[id]/route.ts
│   │   ├── prompts/[id]/route.ts   # Get prompt with summary/viewpoints
│   │   └── models/route.ts         # Available models
│   ├── components/
│   │   ├── ChatInterface.tsx        # Main chat UI
│   │   ├── ChatInput.tsx            # Input component
│   │   ├── LoadingAnimation.tsx    # Boardroom animation
│   │   ├── ResultsDisplay.tsx       # Results container
│   │   ├── SummarySection.tsx        # Summary display
│   │   ├── ViewpointsSection.tsx     # Viewpoints display
│   │   ├── ModelResponse.tsx        # Individual response card
│   │   ├── Sidebar.tsx              # Sidebar navigation
│   │   ├── ChatHistory.tsx          # Conversation history
│   │   ├── ModelSelection.tsx        # Model picker
│   │   └── Settings.tsx              # Settings panel
│   ├── page.tsx                     # Home page
│   └── layout.tsx                    # Root layout
├── lib/
│   ├── prisma.ts                     # Prisma client
│   ├── models.ts                     # Model catalog
│   ├── openrouter.ts                 # OpenRouter integration
│   ├── orchestration.ts              # LLM orchestration
│   └── summary.ts                    # Summary generation
├── prisma/
│   └── schema.prisma                 # Database schema
└── README.md
```

## Database Schema

- **Conversation**: Container for a user session
- **Prompt**: User's question/prompt
- **ModelResponse**: Individual AI model response
- **Summary**: Generated summary of all responses
- **Viewpoint**: Clustered perspective grouping multiple responses
- **ModelCatalog**: Available AI models configuration

## API Endpoints

### POST `/api/chat/stream`
Submit a prompt and receive streaming responses.

**Request:**
```json
{
  "prompt": "What are the pros and cons of remote work?",
  "modelCount": 5
}
```

**Response:** Server-Sent Events stream with events:
- `conversation` - Conversation created
- `prompt` - Prompt created
- `models_started` - Models started processing
- `model_processing` - Model is generating
- `model_completed` - Model finished
- `model_failed` - Model error
- `generating_summary` - Summary generation started
- `summary_completed` - Summary ready
- `complete` - All done

### GET `/api/conversations`
List recent conversations.

### GET `/api/conversations/[id]`
Get a conversation with all prompts and responses.

### GET `/api/prompts/[id]`
Get a prompt with summary and viewpoints.

### GET `/api/models`
Get available models configuration.

## Usage

1. **Select Models**: Use the sidebar to choose which AI models should participate
2. **Enter Prompt**: Type your question in the chat input
3. **Watch Responses**: See responses appear progressively as models complete
4. **Review Summary**: Read the synthesized summary of all responses
5. **Explore Viewpoints**: See how responses cluster into distinct perspectives
6. **View Individual Responses**: Expand any response to see the full answer

## Development Notes

### Node.js Version Requirement

This project requires Node.js 20.9+ for Next.js 16. If you see engine warnings during installation, you may need to upgrade Node.js.

### Prisma Version

The project uses Prisma 7.4.2, which requires Node.js 20.19+. If you encounter Prisma installation issues, ensure your Node.js version is compatible.

### Model Configuration

Models are configured in `lib/models.ts`. Each model needs:
- `id`: Unique identifier (matches OpenRouter model ID)
- `name`: Display name
- `provider`: Provider name
- `enabled`: Whether it's available
- `description`: Optional description

### Adding New Models

1. Add model config to `lib/models.ts`
2. Ensure the model ID matches an OpenRouter model ID
3. Test with a simple prompt

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Run `npx prisma migrate dev` to ensure schema is up to date

### OpenRouter API Errors
- Verify `OPENROUTER_API_KEY` is set correctly
- Check your OpenRouter account has credits
- Ensure model IDs match OpenRouter's model catalog

### Streaming Not Working
- Check browser console for errors
- Verify SSE is supported (all modern browsers)
- Check network tab for streaming response

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
