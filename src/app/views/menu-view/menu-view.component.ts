import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';


@Component({
    selector: 'ctn-menu-view',
    standalone: true,
    templateUrl: './menu-view.component.html',
    styleUrls: ['./menu-view.component.scss'],
    imports: [NgIf, ReactiveFormsModule,
      MatButtonModule,
      MatInputModule
    ]
})
export class MenuViewComponent {

  private formBuilder = inject(FormBuilder);
  private router = inject(Router);

  mode: string | undefined;

  lobbyForm = new FormGroup({
    lobbyId: new FormControl(''),
    mode: new FormControl('Create')
  });

  constructor() {
                this.lobbyForm.valueChanges.subscribe((changes: any) => {
                  this.onFormChange(changes);
                })
  }

  onFormChange(changes: any) {
    if (this.mode == changes.mode) {
      return;
    }
    this.mode = changes.mode;
    if (changes.mode == 'Join') {
      this.lobbyForm.get("lobbyId")?.addValidators(Validators.required);
    } else {
      this.lobbyForm.get("lobbyId")?.removeValidators(Validators.required);
    }
    this.lobbyForm.get("lobbyId")?.updateValueAndValidity();
    console.log(changes);
    console.log(this.lobbyForm);
  }

  onSubmit(): void {
    let lobby = this.lobbyForm.value;
    // TODO: Submit forms to backend and navigate accordingly.
    if (lobby.mode == 'Create') {
      this.createLobby(lobby.lobbyId);
    } else {
      this.joinLobby(lobby.lobbyId);
    }
  }

  createLobby(lobbyId: string | null | undefined) {
    if (!lobbyId || lobbyId == '') {
      // TODO: Generate a random short string
      lobbyId = "TestLobby";
    }
    this.router.navigate(['/lobby'], {queryParams: { 'id': lobbyId }});
  }

  joinLobby(lobbyId: string | null | undefined) {
    if (!lobbyId) {
    } else {
      this.router.navigate(['/lobby'], {queryParams: { 'id': this.lobbyForm.value.lobbyId }});
    }
  }
}
