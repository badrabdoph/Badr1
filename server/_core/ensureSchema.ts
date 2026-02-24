import type { Pool } from "mysql2";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`users\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`openId\` varchar(64) NOT NULL,
\t\`name\` text,
\t\`email\` varchar(320),
\t\`loginMethod\` varchar(64),
\t\`role\` enum('user','admin') NOT NULL DEFAULT 'user',
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\t\`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
\tCONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
\tCONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`contact_info\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`key\` varchar(100) NOT NULL,
\t\`value\` text NOT NULL,
\t\`label\` varchar(200),
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`contact_info_id\` PRIMARY KEY(\`id\`),
\tCONSTRAINT \`contact_info_key_unique\` UNIQUE(\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`packages\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`name\` varchar(200) NOT NULL,
\t\`price\` varchar(50) NOT NULL,
\t\`description\` text,
\t\`features\` json,
\t\`category\` varchar(50) NOT NULL,
\t\`popular\` boolean DEFAULT false,
\t\`visible\` boolean NOT NULL DEFAULT true,
\t\`sortOrder\` int DEFAULT 0,
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`packages_id\` PRIMARY KEY(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`portfolio_images\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`title\` varchar(200) NOT NULL,
\t\`url\` text NOT NULL,
\t\`category\` varchar(50) NOT NULL,
\t\`visible\` boolean NOT NULL DEFAULT true,
\t\`sortOrder\` int DEFAULT 0,
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`portfolio_images_id\` PRIMARY KEY(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`site_content\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`key\` varchar(100) NOT NULL,
\t\`value\` text NOT NULL,
\t\`category\` varchar(50) NOT NULL,
\t\`label\` varchar(200),
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`site_content_id\` PRIMARY KEY(\`id\`),
\tCONSTRAINT \`site_content_key_unique\` UNIQUE(\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`site_images\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`key\` varchar(100) NOT NULL,
\t\`url\` text NOT NULL,
\t\`alt\` varchar(200),
\t\`category\` varchar(50) NOT NULL,
\t\`sortOrder\` int DEFAULT 0,
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`site_images_id\` PRIMARY KEY(\`id\`),
\tCONSTRAINT \`site_images_key_unique\` UNIQUE(\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`site_sections\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`key\` varchar(100) NOT NULL,
\t\`name\` varchar(200) NOT NULL,
\t\`visible\` boolean NOT NULL DEFAULT true,
\t\`sortOrder\` int DEFAULT 0,
\t\`page\` varchar(50) NOT NULL,
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`site_sections_id\` PRIMARY KEY(\`id\`),
\tCONSTRAINT \`site_sections_key_unique\` UNIQUE(\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`testimonials\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`name\` varchar(200) NOT NULL,
\t\`quote\` text NOT NULL,
\t\`visible\` boolean NOT NULL DEFAULT true,
\t\`sortOrder\` int DEFAULT 0,
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`testimonials_id\` PRIMARY KEY(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS \`share_links\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`code\` varchar(120) NOT NULL,
\t\`note\` text,
\t\`expiresAt\` timestamp,
\t\`revokedAt\` timestamp,
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`share_links_id\` PRIMARY KEY(\`id\`),
\tCONSTRAINT \`share_links_code_unique\` UNIQUE(\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
];

let ensured: Promise<void> | null = null;

export async function ensureSchema(pool: Pool) {
  if (ensured) return ensured;
  ensured = (async () => {
    for (const statement of SCHEMA_STATEMENTS) {
      try {
        await pool.query(statement);
      } catch (error) {
        console.warn("[Database] Schema init failed:", error);
      }
    }
  })();
  return ensured;
}
