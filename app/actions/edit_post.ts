"use server"

import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface EditPostParams {
  originalContent: string
  instruction: string
  platform: string
}

export async function editPostWithAI({ originalContent, instruction, platform }: EditPostParams) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert social media content editor for ${platform}. Your job is to modify social media posts based on user instructions while maintaining the core message and appropriate tone for the platform.

Guidelines:
- For X (Twitter): Keep it concise, engaging, use hashtags strategically
- For LinkedIn: Professional tone, can be longer and more detailed
- Maintain the original meaning unless explicitly asked to change it
- Fix any factual errors or hallucinations if pointed out
- Keep emojis unless asked to remove them
- Return ONLY the edited post content, no explanations or quotes`,
        },
        {
          role: "user",
          content: `Original post:\n${originalContent}\n\nEdit instruction: ${instruction}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const editedContent = completion.choices[0]?.message?.content?.trim()

    if (!editedContent) {
      throw new Error("No response from AI")
    }

    return {
      success: true,
      content: editedContent,
    }
  } catch (error) {
    console.error("Error editing post with AI:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to edit post",
    }
  }
}

