ALTER TABLE "volume_backup" ADD COLUMN "encryptionEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "volume_backup" ADD COLUMN "encryptionPassphrase" text;
