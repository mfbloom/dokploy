import { quote } from "shell-quote";

export const ENCRYPTED_BACKUP_SUFFIX = ".enc";

const PASSPHRASE_ENV = "DOKPLOY_VOLUME_BACKUP_PASSPHRASE";

// The passphrase goes through the environment, never argv, so it can't show up in `ps`.
const opensslArgs = `-aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:${PASSPHRASE_ENV}`;

export const isEncryptedBackupFile = (fileName: string) =>
	fileName.endsWith(ENCRYPTED_BACKUP_SUFFIX);

export const exportPassphraseCommand = (passphrase: string) =>
	`export ${PASSPHRASE_ENV}=${quote([passphrase])}`;

export const encryptFileCommand = (input: string, output: string) =>
	`openssl enc ${opensslArgs} -in ${quote([input])} -out ${quote([output])}`;

export const decryptFileCommand = (input: string, output: string) =>
	`openssl enc -d ${opensslArgs} -in ${quote([input])} -out ${quote([output])}`;
