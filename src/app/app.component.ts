import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

interface Exists {
  exists: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'wedding';
  joiningOptions = [
    {
      text: 'Yes, I\'m excited to attend',
      id: 'yes'
    },
    {
      text: 'No, I will sadly miss out',
      id: 'no'
    }
  ];

  guestList: { first: string; last: string; }[] = [];
  subscriptions: Subscription[] = [];
  errorMessage: string = '';
  shouldHideForm: boolean = false;
  shouldShowGotcha: boolean = false;
  loading: boolean = false;

  form: FormGroup = this.fb.group({
    joining: this.fb.group({}),
  });

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient
  ) { }

  public ngOnInit(): void {
    this.subscriptions.push(this.route.queryParams.subscribe(params => {
      if (params) {
        if (params['guests']) {
          const guests = (params['guests'] as string).split('@');
          guests.forEach(guest => {
            const fullName = guest.split('_');
            this.guestList.push({
              first: fullName[0],
              last: fullName[1]
            });
          });

          this.namesExists()
          this.guestsExists();

          for (const guest of this.guestList) {
            (this.form.get('joining') as FormGroup).addControl(guest.first, new FormControl('', Validators.required));
          }
        }
      }
    }));
  }

  private namesExists() {
    this.subscriptions.push(this.http.post<Exists>('https://us-central1-kathyfrancescowedding.cloudfunctions.net/namesExists', {
      names: this.guestList
    }).subscribe((result: Exists) => {
      if (!result.exists) {
        this.shouldShowGotcha = true;
      }
    }));
  }

  private async guestsExists() {
    this.subscriptions.push(this.http.post<Exists>('https://us-central1-kathyfrancescowedding.cloudfunctions.net/guestsExists', {
      guests: this.guestList
    }).subscribe((result: Exists) => {
      if (result.exists) {
        this.shouldHideForm = true;
      }
    }));
  }

  public submit() {
    if (this.form.invalid) {
      this.errorMessage = 'Please complete the form';
      return;
    }

    const result: any[] = [];
    for (const guest of this.guestList) {
      result.push({
        first: guest.first,
        last: guest.last,
        joining: (this.form.get(`joining.${guest.first}`) as FormControl).value,
      });
    }

    try {
      this.loading = true;
      this.subscriptions.push(this.http.post('https://us-central1-kathyfrancescowedding.cloudfunctions.net/addGuests', {
        guests: result
      }).subscribe(() => {
        localStorage.setItem('shouldHideForm', 'true');
        this.shouldHideForm = true;
        this.loading = false;
      }));
    } catch (err) {
      console.error('An error occurred while adding the guests data', err);
      this.loading = false;
    }
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
