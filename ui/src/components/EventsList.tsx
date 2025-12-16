import EventCard from "./EventCard";
import { TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCryptoPriceGuess } from "@/hooks/useCryptoPriceGuess";
import { useMemo, useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import CreateEventModal from "./CreateEventModal";

interface EventData {
  id: number;
  title: string;
  category: string;
  endDate: string;
  participants: number;
  status: "active" | "ended";
}

// Component to render a single event card with data fetching
const EventCardWithData = ({ eventId, refreshKey, onRefresh }: { eventId: number; refreshKey?: number; onRefresh?: () => void }) => {
  const { getEventConfig } = useCryptoPriceGuess();
  const config = getEventConfig(eventId);
  const { data: eventData, refetch, isError, isLoading } = useReadContract({
    ...config,
    query: {
      ...config.query,
      retry: false, // Disable retry to prevent infinite loops
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 30000, // Cache for 30 seconds
    },
  });
  const [lastRefreshKey, setLastRefreshKey] = useState(refreshKey);
  
  // Refetch when refreshKey changes (without refetch in deps)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0 && refreshKey !== lastRefreshKey) {
      setLastRefreshKey(refreshKey);
      refetch();
    }
  }, [refreshKey, lastRefreshKey]);

  // Don't render if error or no data
  if (isError || isLoading || !eventData) {
    return null;
  }

  const tokenType = eventData[1] === 0 ? "BTC" : "ETH";
  const endTime = Number(eventData[3]) * 1000;
  const isActive = eventData[4];
  const isFinalized = eventData[5];
  const admin = eventData[6] as string;
  const totalPredictions = Number(eventData[7]);
  const actualPrice = Number(eventData[8]);
  const decryptedAveragePrice = Number(eventData[9]);

  const event = {
    id: eventId,
    title: eventData[0] || `${tokenType} Price Prediction`,
    category: "Crypto",
    endDate: new Date(endTime).toLocaleDateString(),
    participants: totalPredictions,
    status: isActive ? ("active" as const) : ("ended" as const),
    isFinalized,
    decryptedAveragePrice: isFinalized ? decryptedAveragePrice : undefined,
    actualPrice: actualPrice > 0 ? actualPrice : undefined,
    admin,
  };

  return <EventCard {...event} onPredictionSuccess={() => {
    onRefresh?.();
    refetch();
  }} />;
};

const EventsList = () => {
  const { eventCount, refetchEventCount } = useCryptoPriceGuess();
  const [refreshKey, setRefreshKey] = useState(0);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);

  // Create array of event IDs - only create if eventCount > 0
  const eventIds = useMemo(() => {
    if (!eventCount || eventCount === 0) {
      return [];
    }
    return Array.from({ length: eventCount }, (_, i) => i);
  }, [eventCount]);

  // Function to trigger refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Show placeholder message if no contract events
  if (eventIds.length === 0) {
    return (
      <section className="py-16 px-4 bg-secondary/30 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-encrypted/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 animate-fade-in-up">
            <TrendingUp className="w-8 h-8 text-primary animate-bounce-subtle" />
            <h2 className="text-3xl font-bold">Active Events</h2>
            </div>
            <Button
              onClick={() => setCreateEventModalOpen(true)}
              className="gap-2 hover:scale-105 transition-transform duration-300 animate-fade-in-up stagger-2"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </div>
          <div className="glass-effect rounded-xl p-12 text-center animate-fade-in-scale">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-bounce-subtle" />
            <h3 className="text-xl font-bold mb-2">No Events Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first prediction event to get started
            </p>
            <Button
              onClick={() => setCreateEventModalOpen(true)}
              size="lg"
              className="gap-2 hover:scale-105 transition-transform duration-300"
            >
              <Plus className="w-5 h-5" />
              Create Your First Event
            </Button>
          </div>
        </div>
        <CreateEventModal
          open={createEventModalOpen}
          onOpenChange={(open) => {
            setCreateEventModalOpen(open);
            if (!open) {
              // Refresh event count when modal closes (event might have been created)
              refetchEventCount();
            }
          }}
        />
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-secondary/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-encrypted/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 animate-fade-in-up">
            <TrendingUp className="w-8 h-8 text-primary animate-bounce-subtle" />
            <h2 className="text-3xl font-bold">Active Events</h2>
          </div>
          <Button
            onClick={() => setCreateEventModalOpen(true)}
            variant="outline"
            className="gap-2 hover:scale-105 transition-transform duration-300 animate-fade-in-up stagger-2"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {eventIds.map((eventId, index) => (
            <div
              key={eventId}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <EventCardWithData eventId={eventId} refreshKey={refreshKey} onRefresh={handleRefresh} />
            </div>
          ))}
        </div>
      </div>
      <CreateEventModal
        open={createEventModalOpen}
        onOpenChange={(open) => {
          setCreateEventModalOpen(open);
          if (!open) {
            // Refresh event count when modal closes (event might have been created)
            refetchEventCount();
          }
        }}
      />
    </section>
  );
};

export default EventsList;
