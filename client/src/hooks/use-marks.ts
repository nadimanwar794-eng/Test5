import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type BulkUpdateMarksInput } from "@shared/routes";

export function useUpdateMarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BulkUpdateMarksInput) => {
      const res = await fetch(api.marks.bulkUpdate.path, {
        method: api.marks.bulkUpdate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to update marks");
      }
      
      return api.marks.bulkUpdate.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      // Invalidate specific student AND the list (since totals change)
      queryClient.invalidateQueries({ queryKey: [api.students.get.path, variables.studentId] });
      queryClient.invalidateQueries({ queryKey: [api.students.list.path] });
    },
  });
}
