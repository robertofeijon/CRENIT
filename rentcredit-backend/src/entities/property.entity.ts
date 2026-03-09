import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Payment } from './payment.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zipCode: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  monthlyRent: number;

  @Column('simple-array', { nullable: true })
  images: string[];

  @Column({ nullable: true })
  unitCount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  propertyType: string;

  @Column({ nullable: true })
  bedrooms: number;

  @Column({ nullable: true })
  bathrooms: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  landlord: User;

  @Column()
  landlordId: string;

  @OneToMany(() => Payment, (payment) => payment.property)
  payments: Payment[];
}