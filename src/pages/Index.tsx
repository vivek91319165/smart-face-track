
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, History, Shield, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="container px-4 py-4">
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">
              <LogIn className="w-4 h-4 mr-2" />
              {user ? "Dashboard" : "Sign In"}
            </Link>
          </Button>
        </div>
      </header>
      <div className="container px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Face Attendance
            <span className="text-primary block mt-2">Simplified</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Experience the future of attendance tracking with our advanced face detection system.
            Simple, secure, and effortless.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/record">Start Recording</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link to="/history">View History</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Card className="p-6 transition-all hover:shadow-lg">
            <Camera className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold">Fast Detection</h3>
            <p className="mt-2 text-muted-foreground">
              Advanced face detection technology for quick and accurate attendance recording.
            </p>
          </Card>
          
          <Card className="p-6 transition-all hover:shadow-lg">
            <History className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold">Attendance History</h3>
            <p className="mt-2 text-muted-foreground">
              Access detailed attendance records and analytics at any time.
            </p>
          </Card>
          
          <Card className="p-6 transition-all hover:shadow-lg">
            <Shield className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold">Secure & Private</h3>
            <p className="mt-2 text-muted-foreground">
              Your data is protected with state-of-the-art security measures.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
