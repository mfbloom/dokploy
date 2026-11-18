import { isEncrypted } from "@dokploy/server/lib/encryption";
import { quote } from "shell-quote";

export const ENCRYPTED_BACKUP_SUFFIX = ".enc";

const PASSPHRASE_ENV = "DOKPLOY_VOLUME_BACKUP_PASSPHRASE";

// Passing the passphrase through the environment keeps it out of openssl's
// argv. The surrounding script (and so the export line) is still visible to
// `sh -c` on the host, the same exposure the rclone S3 credentials already have.
const opensslArgs = `-aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:${PASSPHRASE_ENV}`;

export const isEncryptedBackupFile = (fileName: string) =>
	fileName.endsWith(ENCRYPTED_BACKUP_SUFFIX);

// The encryptedText column fails open and returns the stored ciphertext when
// the server key changed; using that as a passphrase would silently encrypt
// backups with a key the user has never seen.
export const assertUsablePassphrase = (passphrase: string) => {
	if (isEncrypted(passphrase)) {
		throw new Error(
			"The stored volume backup passphrase could not be decrypted (ENCRYPTION_KEY or BETTER_AUTH_SECRET changed). Re-enter the passphrase in the volume backup settings.",
		);
	}
};

export const exportPassphraseCommand = (passphrase: string) =>
	`export ${PASSPHRASE_ENV}=${quote([passphrase])}`;

export const encryptFileCommand = (input: string, output: string) =>
	`openssl enc ${opensslArgs} -in ${quote([input])} -out ${quote([output])}`;

export const decryptFileCommand = (input: string, output: string) =>
	`openssl enc -d ${opensslArgs} -in ${quote([input])} -out ${quote([output])}`;
