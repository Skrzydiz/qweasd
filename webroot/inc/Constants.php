                
<?php
/*===================================================================*

  MIT License
  ===========

  Copyright (c) 2005 Jerry Anders.  All rights reserved.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*===================================================================*/

/**
 * This is a place holder for common constants that are used within
 * the application.
 *
 */


// Version ----------------------------------------------------------------

/** @const VERSION_NO The version number as displayed on the UI.   */
// The version mnumber can be manually set by changing N.N.N to
// someting like 1.4.3, or it can be set during build process using
// sed or other editor that can edit this file on the fly
define('VERSION_NO', '3.0.0'); // changing this version number on the
                               // server will cause Live Comments
                               // client to refresh the page and
                               // thereby reload Js and Css files 
                               // -- this is cool.


// Directories ------------------------------------------------------------

list($baseDir, $dir) = split("inc", dirname(__FILE__));
/** @const DIR The base directory. */
define('DIR', $baseDir);
/** @const DIR_WWW The base directory to the Web files. */
define('DIR_WWW', $baseDir . 'www');
/** @const DIR_INC The base directory to the Include files. */
define('DIR_INC', $baseDir . 'inc');


// Databases  -------------------------------------------------------------

// Never keep passwords and other sensitive data in a directory accessible 
// by the web server; e.g. /webroot/www.  Make sure that they are in the
// include (inc) directory or other directory below www.
define('DB_PORT', '3306');
define('DB_URL', 'localhost');
define('DB_SOCKET', '/var/lib/mysql/mysql.sock');
define('DB_USER', 'CommentsDB');
define('DB_USER_PWD', 'password');
define('DB_NAME', 'CommentsDB');

// Other  -----------------------------------------------------------------

define('LIMIT_REPEAT_POSTS', '10');
                
            