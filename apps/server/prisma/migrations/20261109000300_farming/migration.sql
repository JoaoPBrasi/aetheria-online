ALTER TABLE "Character" ADD COLUMN "farmingKitGranted" BOOLEAN NOT NULL DEFAULT false;
-- Stable IDs preserve ownership/crops; only reposition the old seed plots into the farm.
UPDATE "FarmPlot" SET "tileX"=100+CAST(SUBSTRING("id" FROM '([0-9]+)$') AS integer), "tileY"=100
WHERE "id" ~ '^brumavale-farm-([1-9]|1[0-6])$';
UPDATE "FarmPlot" SET
"tileX"=10+((CAST(SUBSTRING("id" FROM '([0-9]+)$') AS integer)-1)%4)*2,
"tileY"=38+((CAST(SUBSTRING("id" FROM '([0-9]+)$') AS integer)-1)/4)*2
WHERE "id" ~ '^brumavale-farm-([1-9]|1[0-6])$';
