-- CreateTable
CREATE TABLE "JobDescription" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "jdText" TEXT NOT NULL,
    "requiredSkills" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" SERIAL NOT NULL,
    "jobDescriptionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "education" TEXT,
    "yearsExperience" TEXT,
    "cvScore" DOUBLE PRECISION,
    "jdMatchScore" DOUBLE PRECISION,
    "finalDecision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "questions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
