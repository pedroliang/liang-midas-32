CREATE TABLE `channel_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channelIndex` int NOT NULL,
	`label` varchar(64),
	`color` varchar(32),
	`faderValue` float NOT NULL DEFAULT 0.75,
	`isMuted` boolean NOT NULL DEFAULT false,
	`isSolo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `channel_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mixer_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL DEFAULT 'Midas M32',
	`ipAddress` varchar(64) NOT NULL,
	`port` int NOT NULL DEFAULT 10023,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mixer_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`data` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `presets_id` PRIMARY KEY(`id`)
);
