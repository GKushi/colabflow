-- DropForeignKey
ALTER TABLE "ProjectUser" DROP CONSTRAINT "ProjectUser_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectUser" DROP CONSTRAINT "ProjectUser_userId_fkey";

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
