ALTER TABLE "Character"
ADD COLUMN "clothingColor" VARCHAR(7) NOT NULL DEFAULT '#c4d597',
ADD COLUMN "hairColor" VARCHAR(7) NOT NULL DEFAULT '#59422f',
ADD COLUMN "skinColor" VARCHAR(7) NOT NULL DEFAULT '#e1b68c',
ADD COLUMN "hairStyle" TEXT NOT NULL DEFAULT 'short';
UPDATE "Character" SET "clothingColor"=CASE "appearance" WHEN 'ember' THEN '#c78059' WHEN 'tide' THEN '#76b2bf' ELSE '#c4d597' END;
ALTER TABLE "Character" ADD CONSTRAINT "Character_cosmetics_valid" CHECK (
"clothingColor" ~ '^#[0-9a-fA-F]{6}$' AND "hairColor" ~ '^#[0-9a-fA-F]{6}$' AND "skinColor" ~ '^#[0-9a-fA-F]{6}$' AND "hairStyle" IN ('short','long','bun','none'));
