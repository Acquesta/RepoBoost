import { useGetMe } from "@workspace/api-client-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth(requireAuth = true) {
  const { data: user, isLoading, isError } = useGetMe({
    query: { retry: false }
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && requireAuth && (isError || !user)) {
      setLocation("/");
    }
  }, [user, isLoading, isError, requireAuth, setLocation]);

  return { user, isLoading };
}
