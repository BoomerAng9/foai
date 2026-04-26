"use client";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveLookInTrigger } from "@/components/live-look-in";

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  team: "sales" | "marketing";
  portrait: string;
  tools: string[];
  blurb: string;
};

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="aspect-[4/5] overflow-hidden bg-secondary">
        <img
          src={member.portrait}
          alt={member.name}
          className="h-full w-full object-cover"
        />
      </div>
      <CardHeader className="gap-2 pt-5">
        <Badge variant="muted" className="w-fit uppercase tracking-widest">
          {member.team === "sales" ? "Sales team" : "Marketing team"}
        </Badge>
        <CardTitle className="text-2xl">{member.name}</CardTitle>
        <CardDescription>{member.role}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{member.blurb}</p>
        <div className="flex flex-wrap gap-1.5">
          {member.tools.map((t) => (
            <Badge key={t} variant="accent" className="font-mono text-[10px]">{t}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="mt-auto gap-2">
        <Button asChild variant="accent" size="sm" className="flex-1">
          <Link href={`/chat?agent=${member.team}`}>
            <MessageSquare className="h-3.5 w-3.5" /> Talk to {member.name.split(" ")[0]}
          </Link>
        </Button>
        <LiveLookInTrigger agent={member.team} />
      </CardFooter>
    </Card>
  );
}
