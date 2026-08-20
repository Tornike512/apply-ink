import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  return user
    ? Response.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      })
    : Response.json({ user: null }, { status: 401 });
}
