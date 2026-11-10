CREATE TABLE "CharacterQuest" (
    "characterId" UUID NOT NULL,
    "questId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "progress" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "CharacterQuest_pkey" PRIMARY KEY ("characterId", "questId"),
    CONSTRAINT "CharacterQuest_status_check" CHECK ("status" IN ('in_progress', 'ready_to_turn_in', 'completed')),
    CONSTRAINT "CharacterQuest_completed_check" CHECK (("status" = 'completed') = ("completedAt" IS NOT NULL)),
    CONSTRAINT "CharacterQuest_progress_check" CHECK (jsonb_typeof("progress") = 'object'),
    CONSTRAINT "CharacterQuest_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
