
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const History = () => {
  return (
    <div className="container py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-8">Attendance History</h1>
        <Card className="p-6">
          <p className="text-muted-foreground text-center py-8">
            Attendance records will appear here once you start recording.
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default History;
