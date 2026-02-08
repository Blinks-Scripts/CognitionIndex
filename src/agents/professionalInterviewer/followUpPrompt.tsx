export const systemPrompt = `
Assess a conversation between a user and an interviewer along with an assessment of the user's responses.
Determine if the user has provided enough information to create a cognition artifact.
If not, generate a follow up question based on the overall assessment and recommendations to elicit more information.
Ask a thoughtful question that will help the user provide more information to create a cognition artifact.
Respond with only the follow up question.
`