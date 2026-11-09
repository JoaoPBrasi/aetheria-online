-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "devTokenHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "appearance" TEXT NOT NULL,
    "mapId" TEXT NOT NULL DEFAULT 'brumavale',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 1024,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 1024,
    "direction" TEXT NOT NULL DEFAULT 'down',
    "health" INTEGER NOT NULL DEFAULT 100,
    "energy" INTEGER NOT NULL DEFAULT 100,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySlot" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "InventorySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "profession" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharacterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterEquipment" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "slot" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "CharacterEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmPlot" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "tileX" INTEGER NOT NULL,
    "tileY" INTEGER NOT NULL,
    "ownerId" UUID,
    "prepared" BOOLEAN NOT NULL DEFAULT false,
    "cropId" TEXT,
    "plantedAt" TIMESTAMP(3),
    "wateredAt" TIMESTAMP(3),
    "harvestAt" TIMESTAMP(3),

    CONSTRAINT "FarmPlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_devTokenHash_key" ON "Account"("devTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Character_accountId_key" ON "Character"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySlot_characterId_index_key" ON "InventorySlot"("characterId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkill_characterId_profession_key" ON "CharacterSkill"("characterId", "profession");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_characterId_slot_key" ON "CharacterEquipment"("characterId", "slot");

-- CreateIndex
CREATE INDEX "FarmPlot_ownerId_idx" ON "FarmPlot"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmPlot_mapId_tileX_tileY_key" ON "FarmPlot"("mapId", "tileX", "tileY");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySlot" ADD CONSTRAINT "InventorySlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmPlot" ADD CONSTRAINT "FarmPlot_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Domain bounds also apply to direct database writes.
ALTER TABLE "InventorySlot" ADD CONSTRAINT "InventorySlot_index_bounds" CHECK ("index" BETWEEN 0 AND 23);
ALTER TABLE "InventorySlot" ADD CONSTRAINT "InventorySlot_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_xp_nonnegative" CHECK ("xp" >= 0);
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_profession_valid" CHECK ("profession" IN ('lumberjack', 'miner', 'farmer', 'blacksmith', 'warrior'));
ALTER TABLE "Character" ADD CONSTRAINT "Character_health_energy_nonnegative" CHECK ("health" >= 0 AND "energy" >= 0);
ALTER TABLE "Character" ADD CONSTRAINT "Character_direction_valid" CHECK ("direction" IN ('up', 'down', 'left', 'right'));
ALTER TABLE "Character" ADD CONSTRAINT "Character_revision_nonnegative" CHECK ("revision" >= 0);
