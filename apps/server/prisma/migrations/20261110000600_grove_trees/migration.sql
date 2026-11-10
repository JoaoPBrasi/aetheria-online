CREATE TABLE "GroveTree" (
    "nodeId" TEXT NOT NULL,
    "cutAt" TIMESTAMP(3) NOT NULL,
    "maturesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroveTree_pkey" PRIMARY KEY ("nodeId"),
    CONSTRAINT "GroveTree_growth_check" CHECK ("maturesAt" > "cutAt")
);
