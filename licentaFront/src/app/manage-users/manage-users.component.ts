import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../services/users.service';
import { Contract, ContractService } from '../services/contract.service';
import { FormsModule, NgModel } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.css']
})
export class ManageUsersComponent implements OnInit {
  users: any[] = [];
  contracts: Contract[] = [];
  isLoading = true;
  error: string | null = null;
  contractDropdownOptions: { id: number, name: string }[] = [];

  selectedContractId: number | null = null;
  editingUserId: number | null = null;

  selectedRole: string | null = null;
  editingRoleUserId: number | null = null;

  constructor(private usersService: UsersService, private contractService: ContractService) { }

  ngOnInit(): void {
    this.loadData();
  }
  loadData(): void {
    this.isLoading = true;

    this.usersService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.contractService.getAllContracts().subscribe({
          next: (contracts) => {
            this.contracts = contracts;
            this.contractDropdownOptions = [
              { id: -1, name: '-- Unassign Contract --' },
              ...contracts
                .filter(c => typeof c.id === 'number')
                .map(c => ({ id: c.id!, name: c.name || 'Unnamed Contract' }))
            ];
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error loading contracts', err);
            this.error = 'Failed to load contracts';
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading users', err);
        this.error = 'Failed to load users';
        this.isLoading = false;
      }
    });
  }


  getContractNameForUser(address: string): string {
    const contract = this.contracts.find(c => c.owner.toLowerCase() === address.toLowerCase());
    return contract ? contract.name || 'Unnamed Contract' : 'NoContract';
  }
  startEditing(userId: number) {
    this.editingUserId = userId;
    const user = this.users.find(u => u.id === userId);
    const contract = this.contracts.find(c => c.owner.toLowerCase() === user.address.toLowerCase());

    if (contract) {
      this.selectedContractId = contract.id!;
      console.log(`✍️ Start editing: user ${user.username} has contract ${contract.name} (ID ${contract.id})`);
    } else {
      this.selectedContractId = -1; // nothing assigned
      console.log(`✍️ Start editing: user ${user.username} has no contract`);
    }
  }

  stopEditing() {
    this.editingUserId = null;
  }

  assignContract(user: any): void {
    console.log(`🧪 Start assignContract for user: ${user.username} (address: ${user.address})`);
    console.log(`🧪 Selected contract ID: ${this.selectedContractId}`);

    if (this.selectedContractId === -1) {
      console.log('🔍 Detected: Unassign request');
      const current = this.contracts.find(c =>
        c.owner.toLowerCase() === user.address.toLowerCase()
      );

      if (current && current.id !== undefined) {
        console.log(`🔄 Unassigning contract ID ${current.id} (${current.name})`);

        this.contractService.updateContract(current.id, {
          owner: '0x0000000000000000000000000000000000000000'
        }).subscribe({
          next: (res) => {
            console.log(` Contract ${current.name} successfully unassigned`, res);
            this.loadData();
            this.stopEditing();
          },
          error: (err) => {
            console.error(` Error unassigning contract ${current.name}`, err);
          }
        });
      } else {
        console.warn(` No contract currently assigned to ${user.username}`);
        this.stopEditing();
      }

      return;
    }

    if (!this.selectedContractId) {
      console.warn(' No contract selected to assign.');
      return;
    }

    console.log(`🔗 Assigning contract ID ${this.selectedContractId} to user ${user.username}`);

    this.contractService.updateContractOwner(this.selectedContractId, user.address).subscribe({
      next: (res) => {
        console.log(` Contract assigned to ${user.username}`, res);
        this.loadData();
        this.stopEditing();
      },
      error: (err) => {
        console.error(` Error assigning contract ID ${this.selectedContractId}`, err);
      }
    });
  }

  startEditingRole(userId: number): void {
    this.editingRoleUserId = userId;
    const user = this.users.find(u => u.id === userId);
    this.selectedRole = user?.role || null;
  }

  assignRole(user: any): void {
    if (!this.selectedRole) return;
    console.log(` Updating role of ${user.username} to ${this.selectedRole}`);

    this.usersService.updateUser(user.id, { role: this.selectedRole }).subscribe({
      next: (res) => {
        console.log(` Role updated for ${user.username}`, res);
        this.loadData();
        this.editingRoleUserId = null;
      },
      error: (err) => {
        console.error(` Error updating role for ${user.username}`, err);
      }
    });
  }

}  