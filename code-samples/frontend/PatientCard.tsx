import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";

/**
 * Sample patient summary card.
 *
 * Demonstrates:
 *   - TanStack Query for cached, deduplicated server reads.
 *   - Cookie-based auth (credentials: "include" sends the AUTH-TOKEN cookie).
 *   - Conditional UI based on the current user's role — the API enforces
 *     the rule; this just hides the button when the action is not allowed.
 *
 * All values shown below are fictional.
 *   PHN-0001, "John Doe", admitted 2024-01-15.
 */

interface PatientSummary {
  phn: string;
  fullName: string;
  age: number;
  sex: "M" | "F" | "X";
  admissionStatus: "ADMITTED" | "DISCHARGED" | "OUTPATIENT";
  primaryDiagnosis: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

async function fetchPatient(phn: string): Promise<PatientSummary> {
  const res = await fetch(`${API_BASE}/api/patients/${phn}/profile`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to load patient ${phn}`);
  return res.json();
}

export function PatientCard({ phn }: { phn: string }) {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "DOCTOR";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["patient", phn],
    queryFn: () => fetchPatient(phn),
    staleTime: 30_000,
  });

  if (isLoading) return <PatientCardSkeleton />;
  if (isError) {
    return (
      <Card>
        <CardContent className="p-4 text-destructive">
          {(error as Error).message}
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{data.fullName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.phn} · {data.age}{data.sex}
          </p>
        </div>
        <Badge
          variant={data.admissionStatus === "ADMITTED" ? "default" : "secondary"}
        >
          {data.admissionStatus}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Primary diagnosis
          </p>
          <p className="text-sm">{data.primaryDiagnosis}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => {/* open edit drawer */}}
          >
            Edit details
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function PatientCardSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-56" />
      </CardContent>
    </Card>
  );
}
