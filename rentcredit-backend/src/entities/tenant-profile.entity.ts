import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('tenant_profiles')
export class TenantProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'int', default: 300 })
  creditScore: number;

  @Column({ type: 'int', default: 0 })
  paymentStreak: number; // consecutive on-time payments

  @Column({ type: 'int', default: 0 })
  totalPayments: number;

  @Column({ type: 'int', default: 0 })
  onTimePayments: number;

  @Column('enum', { enum: ['poor', 'fair', 'good', 'excellent'], default: 'poor' })
  creditTier: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  onTimePaymentPercentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.tenantProfile)
  user: User;
}
