import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ unique: true })
        email: string;

    @Column()
        password: string;

    @Column()
        firstName: string;

    @Column()
        lastName: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
        createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
        updatedAt: Date;
}
