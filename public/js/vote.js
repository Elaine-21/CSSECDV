// public/js/vote.js
$(document).ready(function () {
  // Upvote
  $('[id^="upvoteID:"]').on('click', function () {
    const postId = this.id.split(':')[1];
    $.ajax({
      method: 'POST',
      url: '/api/upvote',
      data: { postID: postId },
      success: function (data) {
        $(`#statusID${postId}`).text(data.numVotes);
        if (data.userAction === 'ENGAGE' || data.userAction === 'SWITCH') {
          $(`#upvoteID\\:${postId}`).addClass('upvote').removeClass('upvote-not');
          $(`#downvoteID\\:${postId}`).addClass('downvote-not').removeClass('downvote');
        } else if (data.userAction === 'DISENGAGE') {
          $(`#upvoteID\\:${postId}`).addClass('upvote-not').removeClass('upvote');
        }
      }
    });
  });

  // Downvote
  $('[id^="downvoteID:"]').on('click', function () {
    const postId = this.id.split(':')[1];
    $.ajax({
      method: 'POST',
      url: '/api/downvote',
      data: { postID: postId },
      success: function (data) {
        $(`#statusID${postId}`).text(data.numVotes);
        if (data.userAction === 'ENGAGE' || data.userAction === 'SWITCH') {
          $(`#downvoteID\\:${postId}`).addClass('downvote').removeClass('downvote-not');
          $(`#upvoteID\\:${postId}`).addClass('upvote-not').removeClass('upvote');
        } else if (data.userAction === 'DISENGAGE') {
          $(`#downvoteID\\:${postId}`).addClass('downvote-not').removeClass('downvote');
        }
      }
    });
  });
});
