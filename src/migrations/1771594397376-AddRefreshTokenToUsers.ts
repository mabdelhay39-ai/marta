import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenToUsers1771594397376 implements MigrationInterface {
    name = 'AddRefreshTokenToUsers1771594397376';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "users" ADD "refreshToken" character varying`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "users" DROP COLUMN "refreshToken"`
        );
    }
}
