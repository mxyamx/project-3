import { HttpInterceptorFn } from '@angular/common/http';
import { getAuth } from 'firebase/auth';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
    const user = getAuth().currentUser;

    if (!user) return next(req);
    return from(user.getIdToken()).pipe(
        switchMap((token) => {
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
        }),
    );
};
