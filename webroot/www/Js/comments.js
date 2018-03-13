                
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
 * xhr namespace
 */
if (typeof(xhr) == "undefined") xhr = {};


/**
 * This class is used to manage page comments using AJAX (asynchronous
 * javascript and xml). There are also a set of helper functions that
 * manage instantiation and page related html to create the dynamic
 * look-and-feel.
 *
 * Send comments to: janders (@) gmail (.) net
 * 
 */
xhr.Comments = function()
{

    // public vars

    this.interval = 30000;      // get interval (30 seconds)
    this.mininterval = 10000;   // 10 seconds to conserve bandwidth and to make 
                                // sure works on highly latent network connections
                                // -- i.e., smaller intervals may not work
    this.maxinterval = 30000;   // 30000 = 30 seconds
    this.timeout;               // var to hold timeout, so timeout can be cleared
    this.url = "Comments.php";  // pointer to server page to process AJAX request
    this.divComments;           // holds entire comments html string
    this.comment;

    // private global vars used by class methods

    var xmlhttp;           // holds xmlhttprequest object
    var url;               // holds this.url
    var ts = 0;            // timestamp sent back from server
    var version;           // LC version sent back from server
    var div;               // to get the callback to work need this for mozilla, et al.
    var divUsers;          // div to display number of active users
    var nUsers = 0;        // number of active users
    var auth;              // temp placeholder for inputAuth value
    var email;             // temp placeholder for inputEmail value
    var comment;           // temp placeholder for textarea value
    var inputAuth;         // author html input field 
    var inputEmail;        // email html input field
    var textareaComment;   // comment textarea
    var inputCounter;      // counter html input field

    // set the xmlhttprequest object
    if (window.XMLHttpRequest) {
        try {
            xmlhttp = new XMLHttpRequest();
        } catch (e) {
            xmlhttp = false;
        }
    } else if (window.ActiveXObject) {
        try {
            xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            try {
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e) {
                xmlhttp = false;
            }
        }
    }


    // privileged methods


    // is this browser capable of xmlHttpRequest?
    this.isBrowserXmlHttpCapable = function()
    {
        return (xmlhttp) ? true : false;
    }


    // set div where comments are to be displayed
    this.setCommentsDiv = function(d)
    {

        if (typeof(d) == "undefined") {
            d = "comments";
        }

        this.divComments = document.getElementById(d);

        if (!xmlhttp) {
            return false;
        } else if (this.divComments) {
            this.divComments.innerHTML =  this.innerHTML;     // set div contents
            this.divComments.className = "visible";           // make comments UI visible if divComments exists

            // set vars used by these functions
            inputAuth = document.getElementById("name");
            inputEmail = document.getElementById("email");
            textareaComment = document.getElementById("ctext");
            inputCounter = document.getElementById("count");

            // div where comments are to be displayed
            div = document.getElementById("entries");
            // div where number of active users are to be displayed
            divUsers = document.getElementById("users");
        } else {
            alert('Comments class requires that \n\n   <div id="comments" class="invisible"></div>\n\n be defined in the HTML file.');
        }
    }


    // Get comments from the server
    this.getComments = function()
    {
        url = this.url;
        _sendRequest("get");
    }


    // Post comments to server
    this.postComment = function()
    {
        if (!xmlhttp) return;

        // set params for posting comments -- read that escape is depricated
        auth = escape(_validChars(inputAuth.value, 32));
        email = escape(_validChars(inputEmail.value, 96));
        if (this.comment) {
            comment = escape(_validChars(this.comment, 255));
            this.comment = "";
        } else {
            comment = escape(_validChars(textareaComment.value, 255));
        }
        // leave name and email intact, clear text, reset counter and refocus on textarea for next comment
        textareaComment.value = "";
        inputCounter.value = 255;
        textareaComment.focus(); // $todo: doesn't work in Safari if user tabbed from email field into the textarea field. 

        // if comment contains text then post it, otherwise do nothing
        url = this.url;
        if (comment) _sendRequest("post");
    }



    // private methods 


    var _sendRequest = function(m)
    {
        xmlhttp.abort(); // this seems to fix uncaught exception in firefox
        xmlhttp.open("POST", url, true);
        xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlhttp.setRequestHeader("Accept","text/xml");
        xmlhttp.onreadystatechange = _commentCallBack;

        switch (m) {
            case "post":
                xmlhttp.send("method=post&ts="+ts+"&auth="+auth+"&email="+email+"&comment="+comment);
                break;
            case "get":
            default:
                xmlhttp.send("method=get&ts="+ts);
                break;
        }
    }

    // Server results are processed here.
    var _commentCallBack = function()
    {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var comment = "";
            var xml = xmlhttp.responseXML;

            if (xml != null && xml.getElementsByTagName("results").item(0) != null) {

                var a = xml.getElementsByTagName("results").item(0);


                // display version, if new version cause page to
                // reload which, as a side effect, will reload the
                // latest Js and Css files on to the client -- see
                // Constants.php for version number

                if (typeof(version) == "undefined") {
                    version = a.getAttribute("version");
                    document.getElementById('version').innerHTML = a.getAttribute("version");
                // do not reload if version is same or if user has typed content in to textarea
                } else if (version != a.getAttribute("version") && !textareaComment.value) {
                    location.reload(true);
                }

                // update timestamp
                ts = a.getAttribute("ts");

                // set number of active users viewing this page -- for visual effect add delay
                if (nUsers != a.getAttribute("numUsers")) {
                    nUsers = a.getAttribute("numUsers");
                    _updateActiveUsers(nUsers);
                }

                var comments = xml.getElementsByTagName("comment");
                var html = _updateCommentList(comments);
                if (html) {
                    div.innerHTML = html + div.innerHTML;
                }

                // Alert user to max posts 
                if (a.getAttribute("error")) {
                    alert("You can only post 10 comments in a row.\n\nYou will be able to post again, once another\nuser posts a comment.");
                }
            }
        }
    }


    // Update the display of active users
    var _updateActiveUsers = function(n)
    {
        divUsers.innerHTML = "&nbsp;";
        if (n <= 1) {
           str = "Currently you are the only viewer...";
        } else {
           str = "Currently&nbsp;" + n + "&nbsp;people are viewing this page...";
        }
        setTimeout(function(){divUsers.innerHTML = str},1000);
    }


    // creates html containing comments
    var _updateCommentList = function(comments)
    {
        var comment = "";
        for (i=0; i<comments.length; i++) {
            var auth = "anonymous"                               // $todo: need to figure out how auth can get set to a null string on post, in the meantime this fixes the problem
            var email = "";
            var n = comments.item(i).childNodes;
            if (n.item(0).childNodes.item(0)) {
                auth = n.item(0).childNodes.item(0).nodeValue;   // $todo: need to figure out how auth can get set to a null string on post, in the meantime this fixes the problem
            }
            if (n.item(1).childNodes.item(0)) {
                email = n.item(1).childNodes.item(0).nodeValue;
            }
            var text = n.item(2).childNodes.item(0).nodeValue;
            var timestamp = n.item(3).childNodes.item(0).nodeValue;
            var d = new Date(timestamp*1000); //* 1000 to convert to milliseconds
            var date = d.getMonth()+1 + "/" + d.getDate() + "/" + d.getFullYear();
            var time = d.toLocaleTimeString();

            comment += 
                "<div class='by'>" +
                " <span class='auth small'>" + auth + "</span>" +
                " <span class='date small'>" + date + "</span>" +
                " <span class='date small'>" + time + "</span>" +
                "</div>";

            if (email) {
                comment += "<div class='eml small'>" + _obfuscateEmail(email) + "</div>";
            }

            comment += "<div><div class='para'>" + text + "</div>";

            comment += "</div>";
        }
        return comment;
    }


    // returns string of only valid characters
    var _validChars = function(str, l)
    {
        // default legal character set is alphanumeric + symbols (note first char is a space)
        var validChars = " abcdefghijklmnopqrstuvwxyz0123456789~`!@#$%^&*()_-+=[]{}\\|;:'\",.<>/?";

        //remove leading and trailing whitespace
        str = str.replace(/^\s+/g, '').replace(/\s+$/g, '');

        //convert carriage returns and newlines entered into textarea to spaces
        str = str.replace(/\r\n|\n/g, ' ');

        // replace <, >, and &
        str = str.replace(/</g, "&lt;");
        str = str.replace(/>/g, "&gt;");
        str = str.replace(/&/g, "&amp;");

       var valid = "";
        for (var i=0; i < str.length; i++) {
            var c = str.charAt(i);
            var s = c.toLowerCase();
            if (validChars.indexOf(s) == -1) continue;
            valid += c;
        }

        // Escapes single quote, double quotes and backslash characters in a string with backslashes
        //valid = (valid + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');

        if (typeof(l) != "undefined") {
            valid = valid.substr(0, l);

            // there is the possibility that once we trim the string we
            // may have chopped off part of &amp; to create something
            // like &am

            // e.g. a name that was entered as <b>abc</b> and is limited
            // to 32 characters would break things because it would get
            // stored as: 
            //    &amp;lt;b&amp;gt;abc&amp;lt;/b&a
            // i.e., the &a on the end breaks things.

            // so let's check for and fix such situations

            valid = valid.replace(/(&$|&a$|&am$|&amp$)/, '');
        }

        return valid;
    }


    // obfuscate user's email address for display
    // note: validation is handled by server-side php code on submit
    var _obfuscateEmail = function(e)
    {
        var m = e.match(/@/g);
        if (m == null || m.length != 1) return false;

        var r1 = Math.round(Math.random()*3); // random number between 0 and 3
        var r2 = Math.round(Math.random()*1); // random number between 0 and 1
        var r3 = Math.round(Math.random()*1); // random number between 0 and 1

        switch (r1) {
        case 0:
          e = (r2) ? e.replace(/@/, " (@) ") : e.replace(/@/, " (at) ");
          e = (r3) ? e.replace(/\./g, " (.) ") : e.replace(/\./g, " (dot) ");
          break;
 
        case 1:
          e = (r2) ? e.replace(/@/, " {@} ") : e.replace(/@/, " {at} ");
          e = (r3) ? e.replace(/\./g, " {.} ") : e.replace(/\./g, " {dot} ");
          break;

        case 2:
          e = (r2) ? e.replace(/@/, " [@] ") : e.replace(/@/, " [at] ");
          e = (r3) ? e.replace(/\./g, " [.] ") : e.replace(/\./g, " [dot] ");
          break;

        case 3:
          e = (r2) ? e.replace(/@/, " @ ") : e.replace(/@/, " at ");
          e = (r3) ? e.replace(/\./g, " . ") : e.replace(/\./g, " dot ");
          break;
        }

        return e;
    }
}

xhr.Comments.prototype =
{

    // public vars and methods


    innerHTML: 
        "<div id='lc'>" +
        " <div id='titleCap'><span id='title'>Live Comments</span><span id='version'></span></div>" +
        " <div class='cap'>" +
        "  <span>Name&nbsp;<span class='xx-small'>(optional)</span>:</span>&nbsp;<input tabindex='1' id='name' class='name' maxlength='16' onmouseover=\"this.className='namef'\" onfocus=\"this.className='namef';this.infocus=true\" onmouseout=\"if(!this.infocus)this.className='name'\" onblur=\"this.className='name';this.infocus=false\">&nbsp;" +
        " </div>" +
        " <div class='cap'>" +
        "  <span>Email&nbsp;&nbsp;<span class='xx-small'>(optional)</span>:</span>&nbsp;<input tabindex='2' id='email' class='email' maxlength='96' onmouseover=\"this.className='emailf'\" onfocus=\"this.className='emailf';this.infocus=true\" onmouseout=\"if(!this.infocus)this.className='email'\" onblur=\"this.className='email';this.infocus=false\">" +
        " </div>" +
        " <div class='cap'>" +
        "  <span>Comment&nbsp;(plain text only)<span id='counter'><input id='count' disabled='disabled' value='255' maxlength='3'/><span class='xx-small'>&nbsp;characters left</span></span>:</span>" +
        " </div>" +
        " <div>" +
        "  <textarea tabindex='3' id='ctext' class='ctext' onKeyDown=\"xhr.Comments.prototype.limitText(this, document.getElementById('count'), 255)\" onKeyUp=\"xhr.Comments.prototype.limitText(this, document.getElementById('count'), 255)\"  onmouseover=\"this.className='ctextf'\" onfocus=\"this.className='ctextf';this.infocus=true\" onmouseout=\"if(!this.infocus)className='ctext'\" onblur=\"className='ctext';this.infocus=false\"></textarea>" +
        " </div>" +
        " <div id='submit'>" +
        "  <div style='float:right'>" +
        "   <input tabindex='4' type='submit' value='submit' class='x-small' title='Post your comment' onclick='submitComment()'/>" +
        "  </div>" +
        " </div>" +
        " <div id='users'>&nbsp;</div>" +
        " <div id='entries'></div>" +
        " <span id='so'>&nbsp;</span>" +
        "</div>",


    // every object has a toString, so what is this class?
    toString:function()
    {
        return "Class to manage page comments using AJAX.";
    },


    // limit number of characters that can be typed in comment textarea
    limitText:function(textField, limitField, limit)
    {
        if (textField.value.length > limit) {
            textField.value = textField.value.substring(0, limit);
        } else {
            limitField.value = limit - textField.value.length;
        }
    },


    // special UI expand routine (more/less)
    more:function(o)
    {
        o.blur();
        o.firstChild.src = "CG/bl.gif";
        o.title = "less";
        var self = this;
        o.onclick = function() {self.less(this)};
        var p = o.parentNode;
        p.childNodes[0].className = "invisible";
        p.childNodes[1].className = "visible";
    },


    // reset more
    less:function(o)
    {
        o.blur();
        o.firstChild.src = "CG/br.gif";
        o.title = "more";
        var self = this;
        o.onclick = function() {self.more(this)};
        var p = o.parentNode;
        p.childNodes[0].className = "visible";
        p.childNodes[1].className = "invisible";
    }

}


/**
 * General helper functions that use Comments class.
 *
 * @author janders
 * 
 */

// initalizes Comments class and sets instance and global vars
function initComments()
{
    _c_ = new xhr.Comments;
    _c_.setCommentsDiv();
    if (_c_.divComments && _c_.isBrowserXmlHttpCapable()) {
        _c_.interval = _c_.mininterval; // override default 60 second interval and set to 10 seconds
        getComments();        // start recursive loop watching for new comments
    } else if (_c_.divComments) {
        _c_.divComments.className = "visible";
    }
}


// loop forever getting any new comments on server
function getComments()
{
    _c_.getComments(); // use AJAX to get comments on server
    // add growth function so that polling slows down over time
    if (_c_.interval < _c_.maxinterval) _c_.interval = _c_.interval * Math.pow(3, (0.00001 * _c_.interval));
    if (_c_.interval > _c_.maxinterval) _c_.interval = _c_.maxinterval;
    _c_.timeout = setTimeout(getComments,_c_.interval); // recursive loop
}


// submit comment using AJAX
function submitComment()
{
    _c_.postComment(); // use AJAX to post comment to server
    // reset interval
    _c_.interval = _c_.mininterval;
    // clear current timeout for getComments
    clearTimeout(_c_.timeout);
    // restart getComments
    setTimeout(getComments,_c_.interval); // add delay otherwise this will cancel postComment
}



/**
 * General helper functions that manage UI.
 *
 * @author janders
 * 
 */
// simple, fun rating system
function rateit(o)
{
    o.blur();
    var rating = null;
    var p = o.parentNode;
    var r = p.getElementsByTagName("input");
    for (var i=0; i<r.length; i++) {
        if (r.item(i).checked) {
            rating = r.item(i).parentNode.title;
            r.item(i).checked = false;
            break;
        }
    }
    if (rating == null) return; // nothing selected
    _c_.comment = rating;
    _c_.postComment();
    document.getElementById("rating").style.display = "none";
}
                
            