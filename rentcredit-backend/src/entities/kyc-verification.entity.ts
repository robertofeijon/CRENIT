import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('kyc_verifications')
export class KYCVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  documentType: string; // 'driver_license', 'passport', 'national_id'

  @Column()
  documentUrl: string;

  @Column({ nullable: true })
  verifiedDocumentUrl: string;

  @Column('enum', { enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  status: string;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  verifiedBy: string; // admin user ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
