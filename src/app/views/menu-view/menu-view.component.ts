import { ChangeDetectorRef, Component, SimpleChange, SimpleChanges } from '@angular/core';
import { FormBuilder, Validator, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';


@Component({
  selector: 'ctn-menu-view',
  providers: [],
  templateUrl: './menu-view.component.html',
  styleUrls: ['./menu-view.component.scss']
})
export class MenuViewComponent {

  mode: string | undefined;

  lobbyForm = this.formBuilder.group({
    lobbyId: null,
    mode: 'Create'
  });

  constructor(private changeDetector: ChangeDetectorRef,
              private formBuilder: FormBuilder,
              private router: Router) {
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
