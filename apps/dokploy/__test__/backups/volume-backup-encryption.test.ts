import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@dokploy/server/services/destination", () => ({
	findDestinationById: vi.fn(async () => ({
		bucket: "bucket",
		accessKey: "key",
		secretAccessKey: "secret",
		region: "us-east-1",
		endpoint: "https://s3.example.com",
		provider: "AWS",
		additionalFlags: [],
	})),
}));

const { backupVolume } = await import(
	"@dokploy/server/utils/volume-backups/backup"
);
const { decryptFileCommand, encryptFileCommand, exportPassphraseCommand } =
	await import("@dokploy/server/utils/volume-backups/encryption");

const baseBackup = {
	serviceType: "compose",
	volumeName: "data",
	turnOff: false,
	prefix: "",
	appName: "volume-backup",
	destinationId: "destination",
	serviceName: "web",
	compose: { appName: "app", serverId: null },
};

const run = (script: string) =>
	spawnSync("bash", ["-c", script], { encoding: "utf8" });

describe("volume backup encryption", () => {
	it("round-trips a file through the encrypt and decrypt commands", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "vb-enc-"));
		const plain = path.join(dir, "data.tar");
		const encrypted = path.join(dir, "data.tar.enc");
		const decrypted = path.join(dir, "restored.tar");
		writeFileSync(plain, "volume contents");

		const result = run(`
			set -e
			${exportPassphraseCommand("p@ss 'word' $HOME")}
			${encryptFileCommand(plain, encrypted)}
			${decryptFileCommand(encrypted, decrypted)}
		`);

		expect(result.status).toBe(0);
		expect(readFileSync(encrypted, "utf8")).not.toContain("volume contents");
		expect(readFileSync(decrypted, "utf8")).toBe("volume contents");
	});

	it("fails to decrypt with the wrong passphrase", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "vb-enc-"));
		const plain = path.join(dir, "data.tar");
		writeFileSync(plain, "volume contents");
		const encrypted = path.join(dir, "data.tar.enc");

		const result = run(`
			${exportPassphraseCommand("correct-passphrase")}
			${encryptFileCommand(plain, encrypted)}
			${exportPassphraseCommand("wrong-passphrase")}
			${decryptFileCommand(encrypted, path.join(dir, "out.tar"))}
		`);

		expect(result.status).not.toBe(0);
	});

	it("encrypts before uploading and uploads the .enc file", async () => {
		const command = await backupVolume({
			...baseBackup,
			encryptionEnabled: true,
			encryptionPassphrase: "secret-passphrase",
		} as any);

		expect(command).toContain("openssl enc");
		expect(command?.indexOf("openssl enc")).toBeLessThan(
			command?.indexOf("rclone copyto") ?? 0,
		);
		expect(command).toMatch(/\.tar\.enc/);
	});

	it("leaves unencrypted backups unchanged", async () => {
		const command = await backupVolume({
			...baseBackup,
			encryptionEnabled: false,
			encryptionPassphrase: null,
		} as any);

		expect(command).not.toContain("openssl");
		expect(command).not.toContain(".tar.enc");
	});

	it("refuses to back up when encryption is on without a passphrase", async () => {
		await expect(
			backupVolume({
				...baseBackup,
				encryptionEnabled: true,
				encryptionPassphrase: null,
			} as any),
		).rejects.toThrow("no passphrase");
	});
});
