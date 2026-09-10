import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Do not retry 401, 403, 404, 409
        if (error?.status === 401 || error?.status === 403 || error?.status === 404 || error?.status === 409) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});
