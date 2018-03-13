                
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
 *  Database abstraction layer
 */

class DB {

    // public vars
    
    // default setting (see Constants.php)
    var $url = DB_URL;
    var $port = DB_PORT;
    var $socket = DB_SOCKET;
    var $userName = DB_USER;
    var $userPwd = DB_USER_PWD;
    var $dbName = DB_NAME;

    // holds query results (record set)
    var $rs = false;

    // rs as an array
    var $rsArray = Array();


    // private vars

    // DB link ID
    var $_id;
    

    // Constructor
    function DB () {}
    
    function connect()
    {
        // Connect to MySQL
        $hostURL = $this->url . ":" . $this->port . ":" . $this->socket;
        $this->_id = mysql_pconnect($hostURL, $this->userName, $this->userPwd);
        if (!$this->_id) {
            die("Could not connect: " . mysql_error());
        }
        
        // Select assigned DB
        if (!mysql_select_db($this->dbName, $this->_id)) {
            die("Could not connect to DB: " . mysql_error());
        }
    }
    
    // Close connection
    function disconnect ()
    {
        if (!mysql_close($this->_id)) {
            die("Could not close DB");
        }
    }
    
    // pseudonym for disconnect
    function close()
    {
        $this->disconnect();
    }

    // Query db
    function query ($sql)
    {
        $this->rs = mysql_query($sql);
        
        $this->rsArray = ''; // clear old values
        while ($row = @mysql_fetch_assoc($this->rs)) {
            $this->rsArray[] = $row;
        }
        
        return $this->rs;
    }
    
    // get last inserted id
    function getInsertId()
    {
        return mysql_insert_id($this->_id);
    }
    
    // get number of rows for results
    function getNumRows()
    {
        mysql_num_rows($this->result);
    }
}

?>
                
            