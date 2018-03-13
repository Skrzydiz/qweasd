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
 * This is the Live Comments server-side script. It handles posting of
 * new comments and also getting comments to display in the web
 * browser. It always returns an xml string of the form:
 * 
 *    "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
 *      "<results post=\"False\" version=\"2.0.1\" ts=\"1150347196\" numUsers=\"7\">
 *        "<comment>"
 *          "<auth>joe</auth>"
 *          "<email>joe@gmail.net</email>"
 *          "<text>Four score and seven years ago...</text>"
 *          "<ts>1137376197</ts>"
 *        "</comment>"
 *        "<comment>"
 *          "<auth>betty</auth>"
 *          "<email>betty@gmail.net</email>"
 *          "<text>Fe Fi Fo Fum...</text>"
 *          "<ts>1137375705</ts>"
 *        "</comment>"
 *        ...
 *      "</results>";
 *
 * Send comments to: janders (@) gmail (.) net
 *
 */

// Find base file path on the server
@define('DIR', dirname(__FILE__) . '/../inc');

// get DB related code
include_once DIR . '/Constants.php';
include_once DIR . '/DBLayer.php';

// process AJAX post/request (xmlhttprequest)
$method = $_POST['method'];
$auth = ($_POST['auth']) ? trim($_POST['auth']) : "Anonymous";
$email = ($_POST['email']) ? strtolower(substr(trim($_POST['email']), 0, 96)) : "";
$comment = ($_POST['comment']) ? trim($_POST['comment']) : "";
$ts = ($_POST['ts']) ? $_POST['ts'] : (($_GET['ts']) ? $_GET['ts'] : 0);
$ip = substr($_SERVER['REMOTE_ADDR'],0, 24);

// changed code to only open one connection, pass $DB as global var.
$DB = new DB;
$DB->connect();

switch ($method) {

 case "post":
    $post=1;
     if (!empty($comment) && validatePoster()) {
         postComment();
         $xml = getComments();
     } else {
         $numUsers = calcActiveUsers();
         $error = True;
         $xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?><results post=\"True\" version=\"" . VERSION_NO . "\" ts=\"$ts\" numUsers=\"$numUsers\" error=\"$error\"/>";
     }
     break;

 case "get":
 default:
    $post=0;
    $xml = getComments();
    break;
}

$DB->close();

// http header sent back to browser
header("Pragma: public");
header("Expires: 0");
header("Cache-Control: must-revalidate, post-check=0, pre-check=0"); 
header("Content-Type: text/xml"); // very important for xmlhttp so that we can use responseXML in JavaScript

// send xml string back to browser
print($xml);
exit;

// script functions

// really simple submit validation...
// if same user has posted 10 comments in 
// a row, reject them until someone else posts a comment
function validatePoster()
{
    global $DB, $ip;

    $sql = "SELECT IP FROM Comments WHERE 1 ORDER BY TimeStamp DESC LIMIT 10";
    $DB->query($sql);

    if ($DB->rs === false) return false;
    $result = $DB->rsArray;

    if (!empty($result) && count($result) == LIMIT_REPEAT_POSTS) {
      foreach ($result as $row) {
        if ($ip != $row["IP"]) return true;
      }
      return false;
    }
    // must be an empty db
    return true;
}

// use ip to approximate number of active users -- using cookies would
// be more accurate, since ip can be masked by proxy servers
function calcActiveUsers()
{
    global $DB, $ip;

    $now = time(); // now

    $sql = "SELECT * FROM ActiveUsers WHERE IP = '$ip'";
    $DB->query($sql);

    if ($DB->rs === false || empty($DB->rsArray)) {
        // this must be a new user, add to ActiveUsers 
        // to track number of users viewing the web page
        $sql = "INSERT INTO ActiveUsers (IP, TimeStamp) VALUES('$ip', '$now')";
    } else {
        // update users timestamp
        $sql = "UPDATE ActiveUsers SET TimeStamp = '$now' WHERE IP = '$ip' ";
    }
    $DB->query($sql);

    // flush old users... if user hasn't hit the server 
    // in the last minute, consider that they are no 
    // longer looking at Live Comments
    $et = time() - 60; // elapsed time: now - 1 minute
    $sql = "DELETE FROM ActiveUsers WHERE TimeStamp < $et";
    $DB->query($sql);

    $sql = "SELECT * FROM ActiveUsers WHERE 1";
    $DB->query($sql);

    if ($DB->rs === false) {
        return 0;
    } else {
        return count($DB->rsArray);
    }
}

// retrieve last 100 comments from CommentsDB
function getComments()
{
    global $DB, $ts, $ip, $post;

    $numUsers = calcActiveUsers();

    // as the DB grows over time, keep things running fast on
    // initial page load by grabbing only one week's worth of data
    // note: 'YmdHis' is the MySQL 4            timestamp format -- e.g., 20051206152942
    // note: 'Y-m-d H:i:s' is the MySQL 4.1, 5+ timestamp format -- e.g., 2005-12-06 15:29:42
    // so use UNIX_TIMESTAMP to do comparison
    //$tt = date('YmdHis',strtotime('-1 weeks'));
    $tt = strtotime('-1 weeks'); // looks like: 1144919156

    // Test timestamp before doing full query to take load off of DB
    /* see EXPERIMENTAL cache code based on file mod timestamp instead of using this DB call
    $sql = "SELECT C.ID, UNIX_TIMESTAMP(C.TimeStamp) AS TS 
            FROM Comments AS C
            ORDER BY C.ID DESC LIMIT 1";
    $DB->query($sql);
    $result = $DB->rsArray;

    $cts = 0;
    if ($DB->rs !== false || !empty($result)) $cts = $result[0]['TS'];
    */

    /* EXPERIMENTAL -- requires cts.cache file in www dir, also see postComment func */
    // much simpler cache technique not involving the DB; see postComment() function below
    $cts = 0;
    if (file_exists("cts.cache")) $cts = filemtime("cts.cache");

    if ($cts > $ts) {

      $sql = "SELECT C.ID, C.Name, E.Email, C.Comment, UNIX_TIMESTAMP(C.TimeStamp) AS TS
              FROM Comments AS C
              LEFT JOIN Email AS E ON E.CID = C.ID
              WHERE C.State = 'A' AND UNIX_TIMESTAMP(C.TimeStamp) > $tt AND UNIX_TIMESTAMP(C.TimeStamp) > $ts
              ORDER BY C.TimeStamp DESC LIMIT 100";
      $DB->query($sql);
      $result = $DB->rsArray;

      // timestamp of latest post
      $ts = $result[0]["TS"];

      $xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" .
             "<results post=\"$post\" version=\"" . VERSION_NO . "\" ts=\"$ts\" numUsers=\"$numUsers\">";

      foreach ($result as $row) {
        $xml .= "<comment>" .
                "<auth>" . $row["Name"] . "</auth>" .
                "<email>" . $row["Email"] . "</email>" .
                "<text>" . $row["Comment"] . "</text>" .
                "<ts>" . $row["TS"] . "</ts>" .
                "</comment>";
        }

      $xml .= "</results>";

    } else {

      $xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?><results post=\"$post\" version=\"" . VERSION_NO . "\" ts=\"$ts\" numUsers=\"$numUsers\"/>";

    }

    return $xml;
}

// post user comments to DB and store email if submitted
// post comments to Comments table and valid email to Email table
function postComment()
{
    global $DB, $auth, $email, $comment, $ip;

    // make sure field lengths don't exceed max length of DB tables
    // length is already handled by client side JavaScript
    // and there was an issue with PHP adding slashes to single and double quotes
    //$auth = strtolower(substr($auth, 0, 32));
    $auth = strtolower($auth);
    //$comment = substr($comment, 0, 255);

    $sql = "INSERT INTO Comments (Name, Comment, IP) VALUES('$auth', '$comment', '$ip')";
    $DB->query($sql);

    if ($DB->rs === false) {
        return false;
    } else if (validateEmail()) {
        $cid = $DB->getInsertId();
        $sql = "INSERT INTO Email (CID, Email) VALUES('$cid', '$email')";
        $DB->query($sql);
    }

    /* EXPERIMENTAL */
    // used to offload the DB, see getComments func above
    if (!isset($cid)) $cid = $DB->getInsertId();
    $fp = fopen("cts.cache", "w");
    fwrite($fp, $cid);
    fclose($fp);

    return true;
}

// Make sure email is of valid form before saving
// simple email syntax validation
function validateEmail()
{
    global $email;

    // Create the syntactical validation regular expression
    $regexp = "^([_a-z0-9-]+)(\.[_a-z0-9-]+)*@([a-z0-9-]+)(\.[a-z0-9-]+)*(\.[a-z]{2,4})$";

    // Validate the syntax
    if (eregi($regexp, $email)) {
        return true;
    }
   return false;
}
?>
