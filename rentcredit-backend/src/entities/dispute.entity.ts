import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Payment } from './payment.entity';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  paymentId: string;

  @ManyToOne(() => Payment, { eager: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column('uuid')
  landlordId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'landlordId' })
  landlord: User;

  @Column('enum', {
    enum: ['overpayment', 'underpayment', 'damage_claim', 'deposit_dispute', 'other'],
    default: 'other',
  })
  type: string;

  @Column()
  reason: string;

  @Column({ nullable: true })
  description: string;

  @Column('enum', {
    enum: ['open', 'in_review', 'resolved', 'rejected'],
    default: 'open',
  })
  status: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ nullable: true })
  resolution: string;

  @Column('uuid', { nullable: true })
  resolvedByAdminId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'resolvedByAdminId' })
  resolvedByAdmin: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  resolutionDate: Date;
}
