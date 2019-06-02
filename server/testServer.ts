// This script will test the access to the certification files used in server.ts

import fs from 'fs';
import { SSL_CERT, SSL_KEY } from '../ProjectInfo';

fs.readFileSync(SSL_CERT);
fs.readFileSync(SSL_KEY);
