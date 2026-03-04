import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Payment } from './payment.entity';
import { TenantProfile } from './tenant-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column('enum', { enum: ['tenant', 'landlord'], default: 'tenant' })
  role: string;

  @Column('enum', { enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  kycStatus: string;

  @Column({ nullable: true })
  kycDocumentUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Payment, (payment) => payment.tenant)
  payments: Payment[];

  @OneToMany(() => TenantProfile, (tenantProfile) => tenantProfile.user)
  tenantProfile: TenantProfile[];
}
