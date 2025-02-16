
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";

const History = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Attendance History</h2>
          <p className="text-muted-foreground">
            Your attendance records will appear here.
          </p>
        </Card>
      </div>
    </Layout>
  );
};

export default History;
