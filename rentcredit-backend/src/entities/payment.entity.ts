import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Property } from './property.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  propertyId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('enum', {
    enum: ['pending', 'completed', 'failed', 'overdue'],
    default: 'pending',
  })
  status: string;

  @Column()
  dueDate: Date;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column({ type: 'boolean', default: false })
  isOnTime: boolean; // paid on or before due date

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.payments)
  tenant: User;

  @ManyToOne(() => Property, (property) => property.payments)
  property: Property;
}
